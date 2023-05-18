/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { v4 as uuidv4 } from 'uuid';
import { Adapters } from '@kbn/inspector-plugin/common/adapters';
import { Filter } from '@kbn/es-query';
import { DataViewField, DataView, ISearchSource } from '@kbn/data-plugin/common';
import type { Query } from '@kbn/data-plugin/common';
import type { KibanaExecutionContext } from '@kbn/core/public';
import { RequestAdapter } from '@kbn/inspector-plugin/common/adapters/request';
import { lastValueFrom } from 'rxjs';
import type { TimeRange } from '@kbn/es-query';
import type { IESAggSource } from '../es_agg_source';
import { AbstractVectorSource, BoundsRequestMeta } from '../vector_source';
import {
  getAutocompleteService,
  getIndexPatternService,
  getTimeFilter,
  getSearchService,
} from '../../../kibana_services';
import { getDataViewNotFoundMessage } from '../../../../common/i18n_getters';
import { createExtentFilter } from '../../../../common/elasticsearch_util';
import { copyPersistentState } from '../../../reducers/copy_persistent_state';
import { DataRequestAbortError } from '../../util/data_request';
import { expandToTileBoundaries } from '../../util/geo_tile_utils';
import { IVectorSource } from '../vector_source';
import {
  AbstractESSourceDescriptor,
  AbstractSourceDescriptor,
  DynamicStylePropertyOptions,
  MapExtent,
  VectorSourceRequestMeta,
} from '../../../../common/descriptor_types';
import { IVectorStyle } from '../../styles/vector/vector_style';
import { IDynamicStyleProperty } from '../../styles/vector/properties/dynamic_style_property';
import { IField } from '../../fields/field';
import { FieldFormatter } from '../../../../common/constants';
import { isValidStringConfig } from '../../util/valid_string_config';
import { mergeExecutionContext } from '../execution_context_utils';

export function isSearchSourceAbortError(error: Error) {
  return error.name === 'AbortError';
}

export interface IESSource extends IVectorSource {
  isESSource(): true;
  getId(): string;
  getIndexPattern(): Promise<DataView>;
  getIndexPatternId(): string;
  getGeoFieldName(): string;
  loadStylePropsMeta({
    layerName,
    style,
    dynamicStyleProps,
    registerCancelCallback,
    sourceQuery,
    timeFilters,
    searchSessionId,
    inspectorAdapters,
    executionContext,
  }: {
    layerName: string;
    style: IVectorStyle;
    dynamicStyleProps: Array<IDynamicStyleProperty<DynamicStylePropertyOptions>>;
    registerCancelCallback: (callback: () => void) => void;
    sourceQuery?: Query;
    timeFilters: TimeRange;
    searchSessionId?: string;
    inspectorAdapters: Adapters;
    executionContext: KibanaExecutionContext;
  }): Promise<object>;
}

export class AbstractESSource extends AbstractVectorSource implements IESSource {
  indexPattern?: DataView;

  readonly _descriptor: AbstractESSourceDescriptor;

  static createDescriptor(
    descriptor: Partial<AbstractESSourceDescriptor>
  ): AbstractESSourceDescriptor {
    if (!isValidStringConfig(descriptor.indexPatternId)) {
      throw new Error(
        'Cannot create AbstractESSourceDescriptor when indexPatternId is not provided'
      );
    }
    return {
      ...descriptor,
      id: isValidStringConfig(descriptor.id) ? descriptor.id! : uuidv4(),
      type: isValidStringConfig(descriptor.type) ? descriptor.type! : '',
      indexPatternId: descriptor.indexPatternId!,
      applyGlobalQuery:
        typeof descriptor.applyGlobalQuery !== 'undefined' ? descriptor.applyGlobalQuery : true,
      applyGlobalTime:
        typeof descriptor.applyGlobalTime !== 'undefined' ? descriptor.applyGlobalTime : true,
      applyForceRefresh:
        typeof descriptor.applyForceRefresh !== 'undefined' ? descriptor.applyForceRefresh : true,
    };
  }

  constructor(descriptor: AbstractESSourceDescriptor) {
    super(AbstractESSource.createDescriptor(descriptor));
    this._descriptor = descriptor;
  }

  getId(): string {
    return this._descriptor.id;
  }

  getApplyGlobalQuery(): boolean {
    return this._descriptor.applyGlobalQuery;
  }

  getApplyGlobalTime(): boolean {
    return this._descriptor.applyGlobalTime;
  }

  getApplyForceRefresh(): boolean {
    return this._descriptor.applyForceRefresh;
  }

  isFieldAware(): boolean {
    return true;
  }

  isQueryAware(): boolean {
    return true;
  }

  getIndexPatternIds(): string[] {
    return [this.getIndexPatternId()];
  }

  getQueryableIndexPatternIds(): string[] {
    if (this.getApplyGlobalQuery()) {
      return [this.getIndexPatternId()];
    }
    return [];
  }

  isESSource(): true {
    return true;
  }

  cloneDescriptor(): AbstractSourceDescriptor {
    const clonedDescriptor = copyPersistentState(this._descriptor);
    // id used as uuid to track requests in inspector
    clonedDescriptor.id = uuidv4();
    return clonedDescriptor;
  }

  async _runEsQuery({
    registerCancelCallback,
    requestDescription,
    requestId,
    requestName,
    searchSessionId,
    searchSource,
    executionContext,
    requestsAdapter,
  }: {
    registerCancelCallback: (callback: () => void) => void;
    requestDescription: string;
    requestId: string;
    requestName: string;
    searchSessionId?: string;
    searchSource: ISearchSource;
    executionContext: KibanaExecutionContext;
    requestsAdapter: RequestAdapter | undefined;
  }): Promise<any> {
    const abortController = new AbortController();
    registerCancelCallback(() => abortController.abort());

    try {
      const { rawResponse: resp } = await lastValueFrom(
        searchSource.fetch$({
          abortSignal: abortController.signal,
          sessionId: searchSessionId,
          legacyHitsTotal: false,
          inspector: {
            adapter: requestsAdapter,
            id: requestId,
            title: requestName,
            description: requestDescription,
          },
          executionContext,
        })
      );
      return resp;
    } catch (error) {
      if (isSearchSourceAbortError(error)) {
        throw new DataRequestAbortError();
      }

      throw new Error(
        i18n.translate('xpack.maps.source.esSource.requestFailedErrorMessage', {
          defaultMessage: `Elasticsearch search request failed, error: {message}`,
          values: { message: error.message },
        })
      );
    }
  }

  async makeSearchSource(
    requestMeta: VectorSourceRequestMeta | BoundsRequestMeta,
    limit: number,
    initialSearchContext?: object
  ): Promise<ISearchSource> {
    const indexPattern = await this.getIndexPattern();
    const globalFilters: Filter[] = requestMeta.applyGlobalQuery ? requestMeta.filters : [];
    const allFilters: Filter[] = [...globalFilters];
    if (requestMeta.joinKeyFilter) {
      allFilters.push(requestMeta.joinKeyFilter);
    }
    if (this.isFilterByMapBounds() && 'buffer' in requestMeta && requestMeta.buffer) {
      // buffer can be empty
      const geoField = await this._getGeoField();
      const buffer: MapExtent =
        'isGeoGridPrecisionAware' in this &&
        'getGeoGridPrecision' in this &&
        (this as IESAggSource).isGeoGridPrecisionAware()
          ? expandToTileBoundaries(
              requestMeta.buffer,
              (this as IESAggSource).getGeoGridPrecision(requestMeta.zoom)
            )
          : requestMeta.buffer;
      const extentFilter = createExtentFilter(buffer, [geoField.name]);

      allFilters.push(extentFilter);
    }

    let isFeatureEditorOpenForLayer = false;
    if ('isFeatureEditorOpenForLayer' in requestMeta) {
      isFeatureEditorOpenForLayer = requestMeta.isFeatureEditorOpenForLayer;
    }

    if (requestMeta.applyGlobalTime && (await this.isTimeAware()) && !isFeatureEditorOpenForLayer) {
      const timeRange = requestMeta.timeslice
        ? {
            from: new Date(requestMeta.timeslice.from).toISOString(),
            to: new Date(requestMeta.timeslice.to).toISOString(),
            mode: 'absolute' as 'absolute',
          }
        : requestMeta.timeFilters;
      const filter = getTimeFilter().createFilter(indexPattern, timeRange);
      if (filter) {
        allFilters.push(filter);
      }
    }
    const searchService = getSearchService();

    const searchSource = await searchService.searchSource.create(initialSearchContext);

    searchSource.setField('index', indexPattern);
    searchSource.setField('size', limit);
    searchSource.setField('filter', allFilters);
    if (requestMeta.applyGlobalQuery && !isFeatureEditorOpenForLayer) {
      searchSource.setField('query', requestMeta.query);
    }

    const parents = [];
    if (requestMeta.sourceQuery && !isFeatureEditorOpenForLayer) {
      const layerSearchSource = searchService.searchSource.createEmpty();
      layerSearchSource.setField('index', indexPattern);
      layerSearchSource.setField('query', requestMeta.sourceQuery);
      parents.push(layerSearchSource);
    }

    if (requestMeta.embeddableSearchContext && !isFeatureEditorOpenForLayer) {
      const embeddableSearchSource = searchService.searchSource.createEmpty();
      embeddableSearchSource.setField('index', indexPattern);
      embeddableSearchSource.setField('query', requestMeta.embeddableSearchContext.query);
      embeddableSearchSource.setField('filter', requestMeta.embeddableSearchContext.filters);
      parents.push(embeddableSearchSource);
    }

    if (parents.length === 1) {
      searchSource.setParent(parents[0]);
    } else if (parents.length === 2) {
      parents[1].setParent(parents[0]);
      searchSource.setParent(parents[1]);
    }

    return searchSource;
  }

  async getBoundsForFilters(
    boundsFilters: BoundsRequestMeta,
    registerCancelCallback: (callback: () => void) => void
  ): Promise<MapExtent | null> {
    const searchSource = await this.makeSearchSource(boundsFilters, 0);
    searchSource.setField('trackTotalHits', false);
    searchSource.setField('aggs', {
      fitToBounds: {
        geo_bounds: {
          field: this.getGeoFieldName(),
        },
      },
    });

    let esBounds;
    try {
      const abortController = new AbortController();
      registerCancelCallback(() => abortController.abort());
      const { rawResponse: esResp } = await lastValueFrom(
        searchSource.fetch$({
          abortSignal: abortController.signal,
          legacyHitsTotal: false,
          executionContext: mergeExecutionContext(
            { description: 'es_source:bounds' },
            boundsFilters.executionContext
          ),
        })
      );

      if (!esResp.aggregations) {
        return null;
      }

      const fitToBounds = esResp.aggregations.fitToBounds as {
        bounds?: {
          top_left: {
            lat: number;
            lon: number;
          };
          bottom_right: {
            lat: number;
            lon: number;
          };
        };
      };

      if (!fitToBounds.bounds) {
        // aggregations.fitToBounds is empty object when there are no matching documents
        return null;
      }
      esBounds = fitToBounds.bounds;
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new DataRequestAbortError();
      }

      return null;
    }

    const minLon = esBounds.top_left.lon;
    const maxLon = esBounds.bottom_right.lon;
    return {
      minLon: minLon > maxLon ? minLon - 360 : minLon, // fixes an ES bbox to straddle dateline
      maxLon,
      minLat: esBounds.bottom_right.lat,
      maxLat: esBounds.top_left.lat,
    };
  }

  async isTimeAware(): Promise<boolean> {
    try {
      const indexPattern = await this.getIndexPattern();
      const timeField = indexPattern.timeFieldName;
      return !!timeField;
    } catch (error) {
      return false;
    }
  }

  getIndexPatternId(): string {
    return this._descriptor.indexPatternId;
  }

  getGeoFieldName(): string {
    if (!this._descriptor.geoField) {
      throw new Error(`Required field 'geoField' not provided in '_descriptor'`);
    }
    return this._descriptor.geoField;
  }

  async getIndexPattern(): Promise<DataView> {
    // Do we need this cache? Doesn't the IndexPatternService take care of this?
    if (this.indexPattern) {
      return this.indexPattern;
    }

    try {
      this.indexPattern = await getIndexPatternService().get(this.getIndexPatternId());
      return this.indexPattern;
    } catch (error) {
      throw new Error(getDataViewNotFoundMessage(this.getIndexPatternId()));
    }
  }

  async supportsFitToBounds(): Promise<boolean> {
    try {
      const geoField = await this._getGeoField();
      return !!geoField.aggregatable;
    } catch (error) {
      return false;
    }
  }

  async _getGeoField(): Promise<DataViewField> {
    const indexPattern = await this.getIndexPattern();
    const geoField = indexPattern.fields.getByName(this.getGeoFieldName());
    if (!geoField) {
      throw new Error(
        i18n.translate('xpack.maps.source.esSource.noGeoFieldErrorMessage', {
          defaultMessage: `Data view "{indexPatternLabel}" no longer contains the geo field "{geoField}"`,
          values: { indexPatternLabel: indexPattern.getName(), geoField: this.getGeoFieldName() },
        })
      );
    }
    return geoField;
  }

  async getDisplayName(): Promise<string> {
    try {
      const indexPattern = await this.getIndexPattern();
      return indexPattern.getName();
    } catch (error) {
      // Unable to load index pattern, just return id as display name
      return this.getIndexPatternId();
    }
  }

  isBoundsAware(): boolean {
    return true;
  }

  async createFieldFormatter(field: IField): Promise<FieldFormatter | null> {
    let indexPattern;
    try {
      indexPattern = await this.getIndexPattern();
    } catch (error) {
      return null;
    }

    const fieldFromIndexPattern = indexPattern.fields.getByName(field.getRootName());
    if (!fieldFromIndexPattern) {
      return null;
    }

    return indexPattern.getFormatterForField(fieldFromIndexPattern).getConverterFor('text');
  }

  async loadStylePropsMeta({
    layerName,
    style,
    dynamicStyleProps,
    registerCancelCallback,
    sourceQuery,
    timeFilters,
    searchSessionId,
    inspectorAdapters,
    executionContext,
  }: {
    layerName: string;
    style: IVectorStyle;
    dynamicStyleProps: Array<IDynamicStyleProperty<DynamicStylePropertyOptions>>;
    registerCancelCallback: (callback: () => void) => void;
    sourceQuery?: Query;
    timeFilters: TimeRange;
    searchSessionId?: string;
    inspectorAdapters: Adapters;
    executionContext: KibanaExecutionContext;
  }): Promise<object> {
    const promises = dynamicStyleProps.map((dynamicStyleProp) => {
      return dynamicStyleProp.getFieldMetaRequest();
    });

    const fieldAggRequests = await Promise.all(promises);
    const allAggs: Record<string, any> = fieldAggRequests.reduce(
      (aggs: Record<string, any>, fieldAggRequest: unknown | null) => {
        return fieldAggRequest ? { ...aggs, ...(fieldAggRequest as Record<string, any>) } : aggs;
      },
      {}
    );

    const indexPattern = await this.getIndexPattern();
    const searchService = getSearchService();
    const searchSource = searchService.searchSource.createEmpty();

    searchSource.setField('index', indexPattern);
    searchSource.setField('size', 0);
    searchSource.setField('aggs', allAggs);
    if (sourceQuery) {
      searchSource.setField('query', sourceQuery);
    }
    if (style.isTimeAware() && (await this.isTimeAware())) {
      const timeFilter = getTimeFilter().createFilter(indexPattern, timeFilters);
      if (timeFilter) {
        searchSource.setField('filter', [timeFilter]);
      }
    }

    const resp = await this._runEsQuery({
      requestId: `${this.getId()}_styleMeta`,
      requestName: i18n.translate('xpack.maps.source.esSource.stylePropsMetaRequestName', {
        defaultMessage: '{layerName} - metadata',
        values: { layerName },
      }),
      searchSource,
      registerCancelCallback,
      requestDescription: i18n.translate(
        'xpack.maps.source.esSource.stylePropsMetaRequestDescription',
        {
          defaultMessage:
            'Elasticsearch request retrieving field metadata used for calculating symbolization bands.',
        }
      ),
      searchSessionId,
      executionContext: mergeExecutionContext(
        { description: 'es_source:style_meta' },
        executionContext
      ),
      requestsAdapter: inspectorAdapters.requests,
    });

    return resp.aggregations;
  }

  getValueSuggestions = async (field: IField, query: string): Promise<string[]> => {
    try {
      const indexPattern = await this.getIndexPattern();
      const indexPatternField = indexPattern.fields.getByName(field.getRootName())!;
      return await getAutocompleteService().getValueSuggestions({
        indexPattern,
        field: indexPatternField,
        query,
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn(
        `Unable to fetch suggestions for field: ${field.getRootName()}, query: ${query}, error: ${
          error.message
        }`
      );
      return [];
    }
  };
}
