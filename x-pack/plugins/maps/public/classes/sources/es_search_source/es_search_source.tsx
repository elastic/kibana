/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
import React, { ReactElement } from 'react';
import type { QueryDslFieldLookup } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { i18n } from '@kbn/i18n';
import type { SearchResponseWarning } from '@kbn/search-response-warnings';
import { GeoJsonProperties, Geometry, Position } from 'geojson';
import type { KibanaExecutionContext } from '@kbn/core/public';
import { type Filter, buildExistsFilter, buildPhraseFilter, type TimeRange } from '@kbn/es-query';
import type { DataViewField, DataView } from '@kbn/data-plugin/common';
import { lastValueFrom } from 'rxjs';
import { Adapters } from '@kbn/inspector-plugin/common/adapters';
import { SortDirection, SortDirectionNumeric } from '@kbn/data-plugin/common';
import { getTileUrlParams } from '@kbn/maps-vector-tile-utils';
import { AbstractESSource } from '../es_source';
import { getCore, getHttp, getSearchService, getTimeFilter } from '../../../kibana_services';
import {
  addFieldToDSL,
  getField,
  hitsToGeoJson,
  isTotalHitsGreaterThan,
  TotalHits,
} from '../../../../common/elasticsearch_util';
import { UpdateSourceEditor } from './update_source_editor';
import {
  DEFAULT_MAX_BUCKETS_LIMIT,
  ES_GEO_FIELD_TYPE,
  FIELD_ORIGIN,
  GEO_JSON_TYPE,
  MVT_GETTILE_API_PATH,
  SCALING_TYPES,
  SOURCE_TYPES,
  VECTOR_SHAPE_TYPE,
} from '../../../../common/constants';
import { getDataSourceLabel, getDataViewLabel } from '../../../../common/i18n_getters';
import { getSourceFields } from '../../../index_pattern_util';
import { loadIndexSettings } from './util/load_index_settings';
import { DEFAULT_FILTER_BY_MAP_BOUNDS } from './constants';
import { ESDocField } from '../../fields/es_doc_field';
import {
  AbstractESSourceDescriptor,
  DataRequestMeta,
  ESSearchSourceDescriptor,
  Timeslice,
  TooltipFeatureAction,
  VectorSourceRequestMeta,
} from '../../../../common/descriptor_types';
import { ImmutableSourceProperty, SourceEditorArgs } from '../source';
import { IField } from '../../fields/field';
import {
  getLayerFeaturesRequestName,
  GetFeatureActionsArgs,
  GeoJsonWithMeta,
  IMvtVectorSource,
  SourceStatus,
} from '../vector_source';
import { ITooltipProperty } from '../../tooltips/tooltip_property';
import { DataRequest } from '../../util/data_request';
import { isValidStringConfig } from '../../util/valid_string_config';
import { TopHitsUpdateSourceEditor } from './top_hits';
import { getDocValueAndSourceFields, ScriptField } from './util/get_docvalue_source_fields';
import {
  addFeatureToIndex,
  deleteFeatureFromIndex,
  getIsDrawLayer,
  getMatchingIndexes,
} from './util/feature_edit';
import { getExecutionContextId, mergeExecutionContext } from '../execution_context_utils';
import { FeatureGeometryFilterForm } from '../../../connected_components/mb_map/tooltip_control/features_tooltip';

type ESSearchSourceSyncMeta = Pick<
  ESSearchSourceDescriptor,
  | 'geoField'
  | 'filterByMapBounds'
  | 'sortField'
  | 'sortOrder'
  | 'scalingType'
  | 'topHitsGroupByTimeseries'
  | 'topHitsSplitField'
  | 'topHitsSize'
>;

export function timerangeToTimeextent(timerange: TimeRange): Timeslice | undefined {
  const timeRangeBounds = getTimeFilter().calculateBounds(timerange);
  return timeRangeBounds.min !== undefined && timeRangeBounds.max !== undefined
    ? {
        from: timeRangeBounds.min.valueOf(),
        to: timeRangeBounds.max.valueOf(),
      }
    : undefined;
}

export const sourceTitle = i18n.translate('xpack.maps.source.esSearchTitle', {
  defaultMessage: 'Documents',
});

export class ESSearchSource extends AbstractESSource implements IMvtVectorSource {
  readonly _descriptor: ESSearchSourceDescriptor;
  protected readonly _tooltipFields: ESDocField[];

  static createDescriptor(descriptor: Partial<ESSearchSourceDescriptor>): ESSearchSourceDescriptor {
    const normalizedDescriptor = AbstractESSource.createDescriptor(
      descriptor
    ) as AbstractESSourceDescriptor & Partial<ESSearchSourceDescriptor>;
    if (!isValidStringConfig(normalizedDescriptor.geoField)) {
      throw new Error('Cannot create an ESSearchSourceDescriptor without a geoField');
    }
    return {
      ...normalizedDescriptor,
      type: SOURCE_TYPES.ES_SEARCH,
      geoField: normalizedDescriptor.geoField!,
      filterByMapBounds:
        typeof descriptor.filterByMapBounds === 'boolean'
          ? descriptor.filterByMapBounds
          : DEFAULT_FILTER_BY_MAP_BOUNDS,
      tooltipProperties: Array.isArray(descriptor.tooltipProperties)
        ? descriptor.tooltipProperties
        : [],
      sortField: isValidStringConfig(descriptor.sortField) ? (descriptor.sortField as string) : '',
      sortOrder: isValidStringConfig(descriptor.sortOrder)
        ? descriptor.sortOrder!
        : SortDirection.desc,
      scalingType: isValidStringConfig(descriptor.scalingType)
        ? descriptor.scalingType!
        : SCALING_TYPES.MVT,
      topHitsGroupByTimeseries:
        typeof normalizedDescriptor.topHitsGroupByTimeseries === 'boolean'
          ? normalizedDescriptor.topHitsGroupByTimeseries
          : false,
      topHitsSplitField: isValidStringConfig(descriptor.topHitsSplitField)
        ? descriptor.topHitsSplitField!
        : '',
      topHitsSize:
        typeof descriptor.topHitsSize === 'number' && descriptor.topHitsSize > 0
          ? descriptor.topHitsSize
          : 1,
    };
  }

  constructor(descriptor: Partial<ESSearchSourceDescriptor>) {
    const sourceDescriptor = ESSearchSource.createDescriptor(descriptor);
    super(sourceDescriptor);
    this._descriptor = sourceDescriptor;
    this._tooltipFields = this._descriptor.tooltipProperties
      ? this._descriptor.tooltipProperties.map((property) => {
          return this.getFieldByName(property);
        })
      : [];
  }

  renderSourceSettingsEditor(sourceEditorArgs: SourceEditorArgs): ReactElement<any> | null {
    if (this._isTopHits()) {
      return (
        <TopHitsUpdateSourceEditor
          source={this}
          indexPatternId={this.getIndexPatternId()}
          onChange={sourceEditorArgs.onChange}
          tooltipFields={this._tooltipFields}
          sortField={this._descriptor.sortField}
          sortOrder={this._descriptor.sortOrder}
          filterByMapBounds={this.isFilterByMapBounds()}
          topHitsGroupByTimeseries={this._descriptor.topHitsGroupByTimeseries}
          topHitsSplitField={this._descriptor.topHitsSplitField}
          topHitsSize={this._descriptor.topHitsSize}
        />
      );
    }

    const getGeoField = () => {
      return this._getGeoField();
    };
    return (
      <UpdateSourceEditor
        source={this}
        indexPatternId={this.getIndexPatternId()}
        getGeoField={getGeoField}
        onChange={sourceEditorArgs.onChange}
        tooltipFields={this._tooltipFields}
        sortField={this._descriptor.sortField}
        sortOrder={this._descriptor.sortOrder}
        scalingType={this._descriptor.scalingType}
        filterByMapBounds={this.isFilterByMapBounds()}
        numberOfJoins={sourceEditorArgs.numberOfJoins}
        hasSpatialJoins={sourceEditorArgs.hasSpatialJoins}
      />
    );
  }

  async getFields(): Promise<IField[]> {
    try {
      const indexPattern = await this.getIndexPattern();
      const fields: DataViewField[] = indexPattern.fields.filter((field) => {
        // Ensure fielddata is enabled for field.
        // Search does not request _source
        return field.aggregatable;
      });

      return fields.map((field): IField => {
        return this.getFieldByName(field.name);
      });
    } catch (error) {
      // failed index-pattern retrieval will show up as error-message in the layer-toc-entry
      return [];
    }
  }

  getFieldByName(fieldName: string): ESDocField {
    return new ESDocField({
      fieldName,
      source: this,
      origin: FIELD_ORIGIN.SOURCE,
    });
  }

  isMvt() {
    return this._descriptor.scalingType === SCALING_TYPES.MVT;
  }

  async getImmutableProperties(): Promise<ImmutableSourceProperty[]> {
    let geoFieldType = '';
    try {
      const geoField = await this._getGeoField();
      geoFieldType = geoField.type;
    } catch (error) {
      // ignore error, geoFieldType will just be blank
    }

    return [
      {
        label: getDataSourceLabel(),
        value: sourceTitle,
      },
      {
        label: getDataViewLabel(),
        value: await this.getDisplayName(),
      },
      {
        label: i18n.translate('xpack.maps.source.esSearch.geoFieldLabel', {
          defaultMessage: 'Geospatial field',
        }),
        value: this._descriptor.geoField,
      },
      {
        label: i18n.translate('xpack.maps.source.esSearch.geoFieldTypeLabel', {
          defaultMessage: 'Geospatial field type',
        }),
        value: geoFieldType,
      },
    ];
  }

  // Returns sort content for an Elasticsearch search body
  _buildEsSort(): Array<Record<string, SortDirectionNumeric>> {
    const { sortField, sortOrder } = this._descriptor;

    if (!sortField) {
      throw new Error('Cannot build sort');
    }
    return [
      {
        [sortField]: {
          order: sortOrder,
        },
      },
    ];
  }

  async _getTopHits(
    layerName: string,
    requestMeta: VectorSourceRequestMeta,
    registerCancelCallback: (callback: () => void) => void,
    inspectorAdapters: Adapters
  ) {
    const {
      topHitsGroupByTimeseries,
      topHitsSplitField: topHitsSplitFieldName,
      topHitsSize,
    } = this._descriptor;

    if (!topHitsGroupByTimeseries && !topHitsSplitFieldName) {
      throw new Error('Cannot _getTopHits without topHitsSplitField');
    }

    const indexPattern: DataView = await this.getIndexPattern();

    const { docValueFields, sourceOnlyFields, scriptFields } = getDocValueAndSourceFields(
      indexPattern,
      requestMeta.fieldNames,
      'epoch_millis'
    );
    const topHits: {
      size: number;
      script_fields: Record<string, { script: ScriptField }>;
      docvalue_fields: Array<string | { format: string; field: string }>;
      fields: string[];
      _source?: boolean | { includes: string[] };
      sort?: Array<Record<string, SortDirectionNumeric>>;
    } = {
      size: topHitsSize,
      script_fields: scriptFields,
      docvalue_fields: docValueFields,
      fields: [this._descriptor.geoField],
    };

    if (this._hasSort()) {
      topHits.sort = this._buildEsSort();
    }

    if (sourceOnlyFields.length === 0) {
      topHits._source = false;
    } else {
      topHits._source = {
        includes: sourceOnlyFields,
      };
    }

    const cardinalityAgg = { precision_threshold: 1 };
    const termsAgg = {
      size: DEFAULT_MAX_BUCKETS_LIMIT,
      shard_size: DEFAULT_MAX_BUCKETS_LIMIT,
    };

    const searchSource = await this.makeSearchSource(requestMeta, 0);
    searchSource.setField('trackTotalHits', false);

    if (topHitsGroupByTimeseries) {
      searchSource.setField('aggs', {
        totalEntities: {
          cardinality: {
            ...cardinalityAgg,
            field: '_tsid',
          },
        },
        entitySplit: {
          terms: {
            ...termsAgg,
            field: '_tsid',
          },
          aggs: {
            entityHits: {
              top_hits: topHits,
            },
          },
        },
      });
    } else {
      const topHitsSplitField: DataViewField = getField(indexPattern, topHitsSplitFieldName);
      searchSource.setField('aggs', {
        totalEntities: {
          cardinality: addFieldToDSL(cardinalityAgg, topHitsSplitField),
        },
        entitySplit: {
          terms: addFieldToDSL(termsAgg, topHitsSplitField),
          aggs: {
            entityHits: {
              top_hits: topHits,
            },
          },
        },
      });
      if (topHitsSplitField.type === 'string') {
        const entityIsNotEmptyFilter = buildPhraseFilter(topHitsSplitField, '', indexPattern);
        entityIsNotEmptyFilter.meta.negate = true;
        searchSource.setField('filter', [
          ...(searchSource.getField('filter') as Filter[]),
          entityIsNotEmptyFilter,
        ]);
      }
    }

    const warnings: SearchResponseWarning[] = [];
    const resp = await this._runEsQuery({
      requestId: this.getId(),
      requestName: getLayerFeaturesRequestName(layerName),
      searchSource,
      registerCancelCallback,
      searchSessionId: requestMeta.searchSessionId,
      executionContext: mergeExecutionContext(
        { description: 'es_search_source:top_hits' },
        requestMeta.executionContext
      ),
      requestsAdapter: inspectorAdapters.requests,
      onWarning: (warning: SearchResponseWarning) => {
        warnings.push(warning);
      },
    });

    const allHits: any[] = [];
    const entityBuckets = _.get(resp, 'aggregations.entitySplit.buckets', []);
    const totalEntities = _.get(resp, 'aggregations.totalEntities.value', 0);
    // can not compare entityBuckets.length to totalEntities because totalEntities is an approximate
    const areEntitiesTrimmed = entityBuckets.length >= DEFAULT_MAX_BUCKETS_LIMIT;
    let areTopHitsTrimmed = false;
    entityBuckets.forEach((entityBucket: any) => {
      const hits = _.get(entityBucket, 'entityHits.hits.hits', []);
      // Reverse hits list so top documents by sort are drawn on top
      allHits.push(...hits.reverse());
      if (isTotalHitsGreaterThan(entityBucket.entityHits.hits.total, hits.length)) {
        areTopHitsTrimmed = true;
      }
    });

    return {
      hits: allHits,
      meta: {
        areResultsTrimmed: areEntitiesTrimmed || areTopHitsTrimmed, // used to force re-fetch when zooming in
        areEntitiesTrimmed,
        entityCount: entityBuckets.length,
        totalEntities,
        warnings,
      },
    };
  }

  // Performs Elasticsearch search request being careful to pull back only required fields to minimize response size
  async _getSearchHits(
    layerName: string,
    requestMeta: VectorSourceRequestMeta,
    registerCancelCallback: (callback: () => void) => void,
    inspectorAdapters: Adapters
  ) {
    const warnings: SearchResponseWarning[] = [];
    const indexPattern = await this.getIndexPattern();

    const { docValueFields, sourceOnlyFields } = getDocValueAndSourceFields(
      indexPattern,
      requestMeta.fieldNames,
      'epoch_millis'
    );

    const initialSearchContext = { docvalue_fields: docValueFields }; // Request fields in docvalue_fields insted of _source

    // Use Kibana global time extent instead of timeslice extent when all documents for global time extent can be loaded
    // to allow for client-side masking of timeslice
    const requestMetaWithoutTimeslice = { ...requestMeta };
    delete requestMetaWithoutTimeslice.timeslice;
    const useRequestMetaWithoutTimeslice =
      requestMeta.timeslice !== undefined &&
      (await this.canLoadAllDocuments(
        layerName,
        requestMetaWithoutTimeslice,
        registerCancelCallback,
        inspectorAdapters,
        (warning) => {
          warnings.push(warning);
        }
      ));

    const maxResultWindow = await this.getMaxResultWindow();
    const searchSource = await this.makeSearchSource(
      useRequestMetaWithoutTimeslice ? requestMetaWithoutTimeslice : requestMeta,
      maxResultWindow,
      initialSearchContext
    );
    searchSource.setField('trackTotalHits', maxResultWindow + 1);
    searchSource.setField('fieldsFromSource', requestMeta.fieldNames); // Setting "fields" filters out unused scripted fields
    if (sourceOnlyFields.length === 0) {
      searchSource.setField('source', false); // do not need anything from _source
    } else {
      searchSource.setField('source', sourceOnlyFields);
    }
    searchSource.setField('fields', [this._descriptor.geoField]);
    if (this._hasSort()) {
      searchSource.setField('sort', this._buildEsSort());
    }

    const resp = await this._runEsQuery({
      requestId: this.getId(),
      requestName: getLayerFeaturesRequestName(layerName),
      searchSource,
      registerCancelCallback,
      searchSessionId: requestMeta.searchSessionId,
      executionContext: mergeExecutionContext(
        { description: 'es_search_source:doc_search' },
        requestMeta.executionContext
      ),
      requestsAdapter: inspectorAdapters.requests,
      onWarning: (warning: SearchResponseWarning) => {
        warnings.push(warning);
      },
    });

    const isTimeExtentForTimeslice =
      requestMeta.timeslice !== undefined && !useRequestMetaWithoutTimeslice;
    return {
      hits: resp.hits.hits.reverse(), // Reverse hits so top documents by sort are drawn on top
      meta: {
        resultsCount: resp.hits.hits.length,
        areResultsTrimmed: isTotalHitsGreaterThan(resp.hits.total, resp.hits.hits.length),
        timeExtent: isTimeExtentForTimeslice
          ? requestMeta.timeslice
          : timerangeToTimeextent(requestMeta.timeFilters),
        isTimeExtentForTimeslice,
        warnings,
      },
    };
  }

  _isTopHits(): boolean {
    return this._descriptor.scalingType === SCALING_TYPES.TOP_HITS;
  }

  async _getSourceIndexList(): Promise<string[]> {
    const dataView = await this.getIndexPattern();
    try {
      const { success, matchingIndexes } = await getMatchingIndexes(dataView.getIndexPattern());
      return success ? matchingIndexes : [];
    } catch (e) {
      // Fail silently
      return [];
    }
  }

  async supportsFeatureEditing(): Promise<boolean> {
    const matchingIndexes = await this._getSourceIndexList();
    // For now we only support 1:1 index-pattern:index matches
    return matchingIndexes.length === 1;
  }

  async _getNewFeatureFields(): Promise<Record<string, Record<string, string>>> {
    if (!(await this._isDrawingIndex())) {
      return {};
    }
    const user = await getCore().security.authc.getCurrentUser();
    const timestamp = new Date().toISOString();
    return {
      created: {
        ...(user ? { user: user.username } : {}),
        '@timestamp': timestamp,
      },
    };
  }

  async _isDrawingIndex(): Promise<boolean> {
    const dataView = await this.getIndexPattern();
    const { success, isDrawingIndex } = await getIsDrawLayer(dataView.getIndexPattern());
    return success && isDrawingIndex;
  }

  _hasSort(): boolean {
    const { sortField, sortOrder } = this._descriptor;
    return !!sortField && !!sortOrder;
  }

  async getMaxResultWindow(): Promise<number> {
    const dataView = await this.getIndexPattern();
    const indexSettings = await loadIndexSettings(dataView.getIndexPattern());
    return indexSettings.maxResultWindow;
  }

  /*
   * Changes in requestMeta.fieldNames requires re-fetch.
   * requestMeta.fieldNames are used to acheive smallest response possible.
   * Response only includes fields required for client usage.
   */
  isFieldAware(): boolean {
    return true;
  }

  getInspectorRequestIds(): string[] {
    return [this.getId(), this._getFeaturesCountRequestId()];
  }

  async getGeoJsonWithMeta(
    layerName: string,
    requestMeta: VectorSourceRequestMeta,
    registerCancelCallback: (callback: () => void) => void,
    isRequestStillActive: () => boolean,
    inspectorAdapters: Adapters
  ): Promise<GeoJsonWithMeta> {
    const indexPattern = await this.getIndexPattern();

    const { hits, meta } = this._isTopHits()
      ? await this._getTopHits(layerName, requestMeta, registerCancelCallback, inspectorAdapters)
      : await this._getSearchHits(
          layerName,
          requestMeta,
          registerCancelCallback,
          inspectorAdapters
        );

    const unusedMetaFields = indexPattern.metaFields.filter((metaField) => {
      return !['_id', '_index'].includes(metaField);
    });
    const flattenHit = (hit: Record<string, any>) => {
      const properties = indexPattern.flattenHit(hit);
      // remove metaFields
      unusedMetaFields.forEach((metaField) => {
        delete properties[metaField];
      });
      return properties;
    };
    const epochMillisFields = requestMeta.fieldNames.filter((fieldName) => {
      const field = getField(indexPattern, fieldName);
      return field.readFromDocValues && field.type === 'date';
    });

    let featureCollection;
    try {
      const geoField = await this._getGeoField();
      featureCollection = hitsToGeoJson(
        hits,
        flattenHit,
        geoField.name,
        geoField.type as ES_GEO_FIELD_TYPE,
        epochMillisFields
      );
    } catch (error) {
      throw new Error(
        i18n.translate('xpack.maps.source.esSearch.convertToGeoJsonErrorMsg', {
          defaultMessage:
            'Unable to convert search response to geoJson feature collection, error: {errorMsg}',
          values: { errorMsg: error.message },
        })
      );
    }

    return {
      data: featureCollection,
      meta,
    };
  }

  hasTooltipProperties(): boolean {
    return this._tooltipFields.length > 0;
  }

  async _loadTooltipProperties(
    docId: string | number,
    index: string,
    indexPattern: DataView,
    executionContext: KibanaExecutionContext
  ) {
    if (this._tooltipFields.length === 0) {
      return {};
    }

    const searchService = getSearchService();
    const searchSource = await searchService.searchSource.create();
    searchSource.setField('trackTotalHits', false);

    searchSource.setField('index', indexPattern);
    searchSource.setField('size', 1);
    const query = {
      language: 'kuery',
      query: `_id:"${docId}" and _index:"${index}"`,
    };
    searchSource.setField('query', query);

    // searchSource calls dataView.getComputedFields to seed docvalueFields
    // dataView.getComputedFields adds each date field in the dataView to docvalueFields to ensure standardized date format across kibana
    // we don't need these as they request unneeded fields and bloat responses
    // setting fieldsFromSource notifies searchSource to filterout unused docvalueFields
    // '_id' is used since the value of 'fieldsFromSource' is irreverent because '_source: false'.
    searchSource.setField('fieldsFromSource', ['_id']);
    searchSource.setField('source', false);

    // Get all tooltip properties from fields API
    searchSource.setField(
      'fields',
      this._getTooltipPropertyNames().map((fieldName) => {
        const field = indexPattern.fields.getByName(fieldName);
        return field && field.type === 'date'
          ? {
              field: fieldName,
              format: 'strict_date_optional_time',
            }
          : fieldName;
      })
    );

    const { rawResponse: resp } = await lastValueFrom(
      searchSource.fetch$({
        legacyHitsTotal: false,
        executionContext: mergeExecutionContext(
          { description: 'es_search_source:load_tooltip_properties' },
          executionContext
        ),
      })
    );

    const hit = _.get(resp, 'hits.hits[0]');
    if (!hit) {
      throw new Error(
        i18n.translate('xpack.maps.source.esSearch.loadTooltipPropertiesErrorMsg', {
          defaultMessage: 'Unable to find document, _id: {docId}',
          values: { docId },
        })
      );
    }

    const properties = indexPattern.flattenHit(hit) as Record<string, string>;
    indexPattern.metaFields.forEach((metaField: string) => {
      if (!this._getTooltipPropertyNames().includes(metaField)) {
        delete properties[metaField];
      }
    });
    return properties;
  }

  _getTooltipPropertyNames(): string[] {
    return this._tooltipFields.map((field: IField) => field.getName());
  }

  async getTooltipProperties(
    properties: GeoJsonProperties,
    executionContext: KibanaExecutionContext
  ): Promise<ITooltipProperty[]> {
    if (properties === null) {
      throw new Error('properties cannot be null');
    }
    const indexPattern = await this.getIndexPattern();
    const propertyValues = await this._loadTooltipProperties(
      properties._id,
      properties._index,
      indexPattern,
      executionContext
    );
    const tooltipProperties = this._tooltipFields.map((field) => {
      const value = propertyValues[field.getName()];
      return field.createTooltipProperty(value);
    });
    return Promise.all(tooltipProperties);
  }

  isFilterByMapBounds(): boolean {
    if (this._descriptor.scalingType === SCALING_TYPES.CLUSTERS) {
      return true;
    } else if (this._descriptor.scalingType === SCALING_TYPES.MVT) {
      return false;
    } else {
      return !!this._descriptor.filterByMapBounds;
    }
  }

  async getLeftJoinFields(): Promise<IField[]> {
    const indexPattern = await this.getIndexPattern();
    // Left fields are retrieved from _source.
    return getSourceFields(indexPattern.fields).map((field): IField => {
      return this.getFieldByName(field.name);
    });
  }

  async getSupportedShapeTypes(): Promise<VECTOR_SHAPE_TYPE[]> {
    let geoFieldType;
    try {
      const geoField = await this._getGeoField();
      geoFieldType = geoField.type;
    } catch (error) {
      // ignore exeception
    }

    if (geoFieldType === ES_GEO_FIELD_TYPE.GEO_POINT) {
      return [VECTOR_SHAPE_TYPE.POINT];
    }

    return [VECTOR_SHAPE_TYPE.POINT, VECTOR_SHAPE_TYPE.LINE, VECTOR_SHAPE_TYPE.POLYGON];
  }

  getSourceStatus(sourceDataRequest?: DataRequest): SourceStatus {
    const meta = sourceDataRequest ? sourceDataRequest.getMeta() : null;
    if (!meta) {
      // no tooltip content needed when there is no feature collection or meta
      return {
        tooltipContent: null,
        areResultsTrimmed: false,
      };
    }

    if (this._isTopHits()) {
      const entitiesFoundMsg = meta.areEntitiesTrimmed
        ? i18n.translate('xpack.maps.esSearch.topHitsResultsTrimmedMsg', {
            defaultMessage: `Results limited to first {entityCount} entities of ~{totalEntities}.`,
            values: {
              entityCount: meta.entityCount?.toLocaleString(),
              totalEntities: meta.totalEntities?.toLocaleString(),
            },
          })
        : i18n.translate('xpack.maps.esSearch.topHitsEntitiesCountMsg', {
            defaultMessage: `Found {entityCount} entities.`,
            values: { entityCount: meta.entityCount?.toLocaleString() },
          });
      const docsPerEntityMsg = i18n.translate('xpack.maps.esSearch.topHitsSizeMsg', {
        defaultMessage: `Showing top {topHitsSize} documents per entity.`,
        values: { topHitsSize: this._descriptor.topHitsSize?.toLocaleString() },
      });

      return {
        tooltipContent: `${entitiesFoundMsg} ${docsPerEntityMsg}`,
        // Used to show trimmed icon in legend
        // user only needs to be notified of trimmed results when entities are trimmed
        areResultsTrimmed: !!meta.areEntitiesTrimmed,
      };
    }

    if (meta.areResultsTrimmed) {
      return {
        tooltipContent: i18n.translate('xpack.maps.esSearch.resultsTrimmedMsg', {
          defaultMessage: `Results limited to first {count} documents.`,
          values: { count: meta.resultsCount?.toLocaleString() },
        }),
        areResultsTrimmed: true,
      };
    }

    return {
      tooltipContent: i18n.translate('xpack.maps.esSearch.featureCountMsg', {
        defaultMessage: `Found {count} documents.`,
        values: { count: meta.resultsCount?.toLocaleString() },
      }),
      areResultsTrimmed: false,
    };
  }

  getSyncMeta(): ESSearchSourceSyncMeta {
    return {
      geoField: this._descriptor.geoField,
      filterByMapBounds: this._descriptor.filterByMapBounds,
      sortField: this._descriptor.sortField,
      sortOrder: this._descriptor.sortOrder,
      scalingType: this._descriptor.scalingType,
      topHitsGroupByTimeseries: this._descriptor.topHitsGroupByTimeseries,
      topHitsSplitField: this._descriptor.topHitsSplitField,
      topHitsSize: this._descriptor.topHitsSize,
    };
  }

  // Returns geo_shape indexed_shape context for spatial quering by pre-indexed shapes
  async _getPreIndexedShape(properties: GeoJsonProperties): Promise<QueryDslFieldLookup | null> {
    if (properties === null) {
      return null;
    }
    const geoField = await this._getGeoField();
    return {
      index: properties._index, // Can not use index pattern title because it may reference many indices
      id: properties._id,
      path: geoField.name,
    };
  }

  supportsJoins(): boolean {
    // can only join with features, not aggregated clusters
    return this._descriptor.scalingType !== SCALING_TYPES.CLUSTERS;
  }

  async _getEditableIndex(): Promise<string> {
    const indexList = await this._getSourceIndexList();
    if (indexList.length === 0) {
      throw new Error(
        i18n.translate('xpack.maps.source.esSearch.indexZeroLengthEditError', {
          defaultMessage: `Your data view doesn't point to any indices.`,
        })
      );
    }
    if (indexList.length > 1) {
      throw new Error(
        i18n.translate('xpack.maps.source.esSearch.indexOverOneLengthEditError', {
          defaultMessage: `Your data view points to multiple indices. Only one index is allowed per data view.`,
        })
      );
    }
    return indexList[0];
  }

  async addFeature(geometry: Geometry | Position[]) {
    const index = await this._getEditableIndex();
    await addFeatureToIndex(
      index,
      geometry,
      this.getGeoFieldName(),
      await this._getNewFeatureFields()
    );
  }

  async deleteFeature(featureId: string) {
    const index = await this._getEditableIndex();
    await deleteFeatureFromIndex(index, featureId);
  }

  getTileSourceLayer(): string {
    return 'hits';
  }

  async getTileUrl(
    requestMeta: VectorSourceRequestMeta,
    refreshToken: string,
    hasLabels: boolean,
    buffer: number
  ): Promise<string> {
    const dataView = await this.getIndexPattern();
    const indexSettings = await loadIndexSettings(dataView.getIndexPattern());

    const searchSource = await this.makeSearchSource(requestMeta, indexSettings.maxResultWindow);
    // searchSource calls dataView.getComputedFields to seed docvalueFields
    // dataView.getComputedFields adds each date field in the dataView to docvalueFields to ensure standardized date format across kibana
    // we don't need these as they request unneeded fields and bloat responses
    // setting fieldsFromSource notifies searchSource to filterout unused docvalueFields
    // '_id' is used since the value of 'fieldsFromSource' is irreverent because '_source: false'.
    searchSource.setField('fieldsFromSource', ['_id']);
    searchSource.setField('source', false);
    if (this._hasSort()) {
      searchSource.setField('sort', this._buildEsSort());
    }

    // use fields API
    searchSource.setField(
      'fields',
      requestMeta.fieldNames.map((fieldName) => {
        const field = dataView.fields.getByName(fieldName);
        return field && field.type === 'date'
          ? {
              field: fieldName,
              format: 'epoch_millis',
            }
          : fieldName;
      })
    );

    // Filter out documents without geo fields to avoid shard failures for indices without geo fields
    searchSource.setField('filter', [
      ...(searchSource.getField('filter') as Filter[]),
      buildExistsFilter({ name: this._descriptor.geoField, type: 'geo_point' }, dataView),
    ]);

    const mvtUrlServicePath = getHttp().basePath.prepend(`${MVT_GETTILE_API_PATH}/{z}/{x}/{y}.pbf`);

    const tileUrlParams = getTileUrlParams({
      geometryFieldName: this._descriptor.geoField,
      index: dataView.getIndexPattern(),
      hasLabels,
      buffer,
      requestBody: _.pick(searchSource.getSearchRequestBody(), [
        'fields',
        'query',
        'runtime_mappings',
        'size',
        'sort',
      ]),
      token: refreshToken,
      executionContextId: getExecutionContextId(requestMeta.executionContext),
    });
    return `${mvtUrlServicePath}?${tileUrlParams}`;
  }

  async getTimesliceMaskFieldName(): Promise<string | null> {
    if (this._isTopHits() || this._descriptor.scalingType === SCALING_TYPES.MVT) {
      return null;
    }
    try {
      const indexPattern = await this.getIndexPattern();
      return indexPattern.timeFieldName ? indexPattern.timeFieldName : null;
    } catch (e) {
      // do not throw when index pattern does not exist, error will be surfaced by getGeoJsonWithMeta
      return null;
    }
  }

  getUpdateDueToTimeslice(prevMeta: DataRequestMeta, timeslice?: Timeslice): boolean {
    if (this._isTopHits() || this._descriptor.scalingType === SCALING_TYPES.MVT) {
      return true;
    }

    if (
      prevMeta.timeExtent === undefined ||
      prevMeta.areResultsTrimmed === undefined ||
      prevMeta.areResultsTrimmed
    ) {
      return true;
    }

    const isTimeExtentForTimeslice =
      prevMeta.isTimeExtentForTimeslice !== undefined ? prevMeta.isTimeExtentForTimeslice : false;
    if (!timeslice) {
      return isTimeExtentForTimeslice
        ? // Previous request only covers timeslice extent. Will need to re-fetch data to cover global time extent
          true
        : // Previous request covers global time extent.
          // No need to re-fetch data since previous request already has data for the entire global time extent.
          false;
    }

    const isWithin = isTimeExtentForTimeslice
      ? timeslice.from >= prevMeta.timeExtent.from && timeslice.to <= prevMeta.timeExtent.to
      : true;
    return !isWithin;
  }

  private _getFeaturesCountRequestId() {
    return this.getId() + 'features_count';
  }

  async canLoadAllDocuments(
    layerName: string,
    requestMeta: VectorSourceRequestMeta,
    registerCancelCallback: (callback: () => void) => void,
    inspectorAdapters: Adapters,
    onWarning: (warning: SearchResponseWarning) => void
  ) {
    const maxResultWindow = await this.getMaxResultWindow();
    const searchSource = await this.makeSearchSource(requestMeta, 0);
    searchSource.setField('trackTotalHits', maxResultWindow + 1);
    const resp = await this._runEsQuery({
      requestId: this._getFeaturesCountRequestId(),
      requestName: i18n.translate('xpack.maps.vectorSource.featuresCountRequestName', {
        defaultMessage: 'load features count ({layerName})',
        values: { layerName },
      }),
      searchSource,
      registerCancelCallback,
      searchSessionId: requestMeta.searchSessionId,
      executionContext: mergeExecutionContext(
        { description: 'es_search_source:all_doc_counts' },
        requestMeta.executionContext
      ),
      requestsAdapter: inspectorAdapters.requests,
      onWarning,
    });
    return !isTotalHitsGreaterThan(resp.hits.total as unknown as TotalHits, maxResultWindow);
  }

  getFeatureActions({
    addFilters,
    geoFieldNames,
    getActionContext,
    getFilterActions,
    mbFeature,
    onClose,
  }: GetFeatureActionsArgs): TooltipFeatureAction[] {
    if (geoFieldNames.length === 0 || addFilters === null) {
      return [];
    }

    const isPolygon =
      mbFeature.geometry.type === GEO_JSON_TYPE.POLYGON ||
      mbFeature.geometry.type === GEO_JSON_TYPE.MULTI_POLYGON;

    return isPolygon
      ? [
          {
            label: i18n.translate('xpack.maps.tooltip.action.filterByGeometryLabel', {
              defaultMessage: 'Filter by geometry',
            }),
            id: 'FILTER_BY_PRE_INDEXED_SHAPE_ACTION',
            form: (
              <FeatureGeometryFilterForm
                onClose={onClose}
                geoFieldNames={geoFieldNames}
                addFilters={addFilters}
                getFilterActions={getFilterActions}
                getActionContext={getActionContext}
                loadPreIndexedShape={async () => {
                  return this._getPreIndexedShape(mbFeature.properties);
                }}
              />
            ),
          },
        ]
      : [];
  }
}
