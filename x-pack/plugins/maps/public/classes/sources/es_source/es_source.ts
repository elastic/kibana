/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import uuid from 'uuid/v4';
import { Filter, IFieldType, IndexPattern, ISearchSource } from 'src/plugins/data/public';
import { AbstractVectorSource, BoundsFilters } from '../vector_source';
import {
  getAutocompleteService,
  getIndexPatternService,
  getTimeFilter,
  getSearchService,
} from '../../../kibana_services';
import { createExtentFilter } from '../../../../common/elasticsearch_util';
import { copyPersistentState } from '../../../reducers/util';
import { DataRequestAbortError } from '../../util/data_request';
import { expandToTileBoundaries } from '../../../../common/geo_tile_utils';
import { search } from '../../../../../../../src/plugins/data/public';
import { IVectorSource } from '../vector_source';
import { TimeRange } from '../../../../../../../src/plugins/data/common';
import {
  AbstractESSourceDescriptor,
  AbstractSourceDescriptor,
  DynamicStylePropertyOptions,
  MapExtent,
  MapQuery,
  VectorJoinSourceRequestMeta,
  VectorSourceRequestMeta,
} from '../../../../common/descriptor_types';
import { IVectorStyle } from '../../styles/vector/vector_style';
import { IDynamicStyleProperty } from '../../styles/vector/properties/dynamic_style_property';
import { IField } from '../../fields/field';
import { ES_GEO_FIELD_TYPE, FieldFormatter } from '../../../../common/constants';
import {
  Adapters,
  RequestResponder,
} from '../../../../../../../src/plugins/inspector/common/adapters';
import { isValidStringConfig } from '../../util/valid_string_config';

export interface IESSource extends IVectorSource {
  isESSource(): true;
  getId(): string;
  getIndexPattern(): Promise<IndexPattern>;
  getIndexPatternId(): string;
  getGeoFieldName(): string;
  loadStylePropsMeta({
    layerName,
    style,
    dynamicStyleProps,
    registerCancelCallback,
    sourceQuery,
    timeFilters,
  }: {
    layerName: string;
    style: IVectorStyle;
    dynamicStyleProps: Array<IDynamicStyleProperty<DynamicStylePropertyOptions>>;
    registerCancelCallback: (callback: () => void) => void;
    sourceQuery?: MapQuery;
    timeFilters: TimeRange;
  }): Promise<object>;
}

export class AbstractESSource extends AbstractVectorSource implements IESSource {
  indexPattern?: IndexPattern;

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
      id: isValidStringConfig(descriptor.id) ? descriptor.id! : uuid(),
      type: isValidStringConfig(descriptor.type) ? descriptor.type! : '',
      indexPatternId: descriptor.indexPatternId!,
      applyGlobalQuery:
        typeof descriptor.applyGlobalQuery !== 'undefined' ? descriptor.applyGlobalQuery : true,
      applyGlobalTime:
        typeof descriptor.applyGlobalTime !== 'undefined' ? descriptor.applyGlobalTime : true,
    };
  }

  constructor(descriptor: AbstractESSourceDescriptor, inspectorAdapters?: Adapters) {
    super(AbstractESSource.createDescriptor(descriptor), inspectorAdapters);
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

  isFieldAware(): boolean {
    return true;
  }

  isRefreshTimerAware(): boolean {
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

  destroy() {
    const inspectorAdapters = this.getInspectorAdapters();
    if (inspectorAdapters?.requests) {
      inspectorAdapters.requests.resetRequest(this.getId());
    }
  }

  cloneDescriptor(): AbstractSourceDescriptor {
    const clonedDescriptor = copyPersistentState(this._descriptor);
    // id used as uuid to track requests in inspector
    clonedDescriptor.id = uuid();
    return clonedDescriptor;
  }

  async _runEsQuery({
    requestId,
    requestName,
    requestDescription,
    searchSource,
    registerCancelCallback,
  }: {
    requestId: string;
    requestName: string;
    requestDescription: string;
    searchSource: ISearchSource;
    registerCancelCallback: (callback: () => void) => void;
  }): Promise<any> {
    const abortController = new AbortController();
    registerCancelCallback(() => abortController.abort());

    const inspectorAdapters = this.getInspectorAdapters();
    let inspectorRequest: RequestResponder | undefined;
    if (inspectorAdapters?.requests) {
      inspectorRequest = inspectorAdapters.requests.start(requestName, {
        id: requestId,
        description: requestDescription,
      });
    }

    let resp;
    try {
      if (inspectorRequest) {
        const requestStats = search.getRequestInspectorStats(searchSource);
        inspectorRequest.stats(requestStats);
        searchSource.getSearchRequestBody().then((body) => {
          if (inspectorRequest) {
            inspectorRequest.json(body);
          }
        });
      }
      resp = await searchSource.fetch({ abortSignal: abortController.signal });
      if (inspectorRequest) {
        const responseStats = search.getResponseInspectorStats(resp, searchSource);
        inspectorRequest.stats(responseStats).ok({ json: resp });
      }
    } catch (error) {
      if (inspectorRequest) {
        inspectorRequest.error(error);
      }
      if (error.name === 'AbortError') {
        throw new DataRequestAbortError();
      }

      throw new Error(
        i18n.translate('xpack.maps.source.esSource.requestFailedErrorMessage', {
          defaultMessage: `Elasticsearch search request failed, error: {message}`,
          values: { message: error.message },
        })
      );
    }

    return resp;
  }

  async makeSearchSource(
    searchFilters: VectorSourceRequestMeta | VectorJoinSourceRequestMeta | BoundsFilters,
    limit: number,
    initialSearchContext?: object
  ): Promise<ISearchSource> {
    const indexPattern = await this.getIndexPattern();
    const globalFilters: Filter[] = searchFilters.applyGlobalQuery ? searchFilters.filters : [];
    const allFilters: Filter[] = [...globalFilters];
    if (this.isFilterByMapBounds() && 'buffer' in searchFilters && searchFilters.buffer) {
      // buffer can be empty
      const geoField = await this._getGeoField();
      const buffer: MapExtent =
        this.isGeoGridPrecisionAware() &&
        'geogridPrecision' in searchFilters &&
        typeof searchFilters.geogridPrecision === 'number'
          ? expandToTileBoundaries(searchFilters.buffer, searchFilters.geogridPrecision)
          : searchFilters.buffer;
      const extentFilter = createExtentFilter(
        buffer,
        geoField.name,
        geoField.type as ES_GEO_FIELD_TYPE
      );

      // @ts-expect-error
      allFilters.push(extentFilter);
    }
    if (searchFilters.applyGlobalTime && (await this.isTimeAware())) {
      const filter = getTimeFilter().createFilter(indexPattern, searchFilters.timeFilters);
      if (filter) {
        allFilters.push(filter);
      }
    }
    const searchService = getSearchService();
    const searchSource = await searchService.searchSource.create(initialSearchContext);

    searchSource.setField('index', indexPattern);
    searchSource.setField('size', limit);
    searchSource.setField('filter', allFilters);
    if (searchFilters.applyGlobalQuery) {
      searchSource.setField('query', searchFilters.query);
    }

    if (searchFilters.sourceQuery) {
      const layerSearchSource = searchService.searchSource.createEmpty();

      layerSearchSource.setField('index', indexPattern);
      layerSearchSource.setField('query', searchFilters.sourceQuery);
      searchSource.setParent(layerSearchSource);
    }

    return searchSource;
  }

  async getBoundsForFilters(
    boundsFilters: BoundsFilters,
    registerCancelCallback: (callback: () => void) => void
  ): Promise<MapExtent | null> {
    const searchSource = await this.makeSearchSource(boundsFilters, 0);
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
      const esResp = await searchSource.fetch({ abortSignal: abortController.signal });
      if (!esResp.aggregations.fitToBounds.bounds) {
        // aggregations.fitToBounds is empty object when there are no matching documents
        return null;
      }
      esBounds = esResp.aggregations.fitToBounds.bounds;
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
      throw new Error('Should not call');
    }
    return this._descriptor.geoField;
  }

  async getIndexPattern(): Promise<IndexPattern> {
    // Do we need this cache? Doesn't the IndexPatternService take care of this?
    if (this.indexPattern) {
      return this.indexPattern;
    }

    try {
      this.indexPattern = await getIndexPatternService().get(this.getIndexPatternId());
      return this.indexPattern;
    } catch (error) {
      throw new Error(
        i18n.translate('xpack.maps.source.esSource.noIndexPatternErrorMessage', {
          defaultMessage: `Unable to find Index pattern for id: {indexPatternId}`,
          values: { indexPatternId: this.getIndexPatternId() },
        })
      );
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

  async _getGeoField(): Promise<IFieldType> {
    const indexPattern = await this.getIndexPattern();
    const geoField = indexPattern.fields.getByName(this.getGeoFieldName());
    if (!geoField) {
      throw new Error(
        i18n.translate('xpack.maps.source.esSource.noGeoFieldErrorMessage', {
          defaultMessage: `Index pattern {indexPatternTitle} no longer contains the geo field {geoField}`,
          values: { indexPatternTitle: indexPattern.title, geoField: this.getGeoFieldName() },
        })
      );
    }
    return geoField;
  }

  async getDisplayName(): Promise<string> {
    try {
      const indexPattern = await this.getIndexPattern();
      return indexPattern.title;
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
  }: {
    layerName: string;
    style: IVectorStyle;
    dynamicStyleProps: Array<IDynamicStyleProperty<DynamicStylePropertyOptions>>;
    registerCancelCallback: (callback: () => void) => void;
    sourceQuery?: MapQuery;
    timeFilters: TimeRange;
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
