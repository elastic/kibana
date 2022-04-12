/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
import React, { ReactElement } from 'react';
import { i18n } from '@kbn/i18n';
import { GeoJsonProperties, Geometry, Position } from 'geojson';
import { type Filter, buildPhraseFilter } from '@kbn/es-query';
import type { DataViewField, DataView } from 'src/plugins/data/common';
import { AbstractESSource } from '../es_source';
import {
  getHttp,
  getSearchService,
  getSecurityService,
  getTimeFilter,
} from '../../../kibana_services';
import {
  addFieldToDSL,
  getField,
  hitsToGeoJson,
  isTotalHitsGreaterThan,
  PreIndexedShape,
  TotalHits,
} from '../../../../common/elasticsearch_util';
import { encodeMvtResponseBody } from '../../../../common/mvt_request_body';
// @ts-expect-error
import { UpdateSourceEditor } from './update_source_editor';
import {
  DEFAULT_MAX_BUCKETS_LIMIT,
  ES_GEO_FIELD_TYPE,
  FIELD_ORIGIN,
  GIS_API_PATH,
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
import { registerSource } from '../source_registry';
import {
  DataRequestMeta,
  ESSearchSourceDescriptor,
  Timeslice,
  VectorSourceRequestMeta,
} from '../../../../common/descriptor_types';
import { Adapters } from '../../../../../../../src/plugins/inspector/common/adapters';
import {
  SortDirection,
  SortDirectionNumeric,
  TimeRange,
} from '../../../../../../../src/plugins/data/common';
import { ImmutableSourceProperty, SourceEditorArgs } from '../source';
import { IField } from '../../fields/field';
import { GeoJsonWithMeta, IMvtVectorSource, SourceStatus } from '../vector_source';
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
import { makePublicExecutionContext } from '../../../util';

type ESSearchSourceSyncMeta = Pick<
  ESSearchSourceDescriptor,
  | 'filterByMapBounds'
  | 'sortField'
  | 'sortOrder'
  | 'scalingType'
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
    const normalizedDescriptor = AbstractESSource.createDescriptor(descriptor);
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
      topHitsSplitField: isValidStringConfig(descriptor.topHitsSplitField)
        ? descriptor.topHitsSplitField!
        : '',
      topHitsSize:
        typeof descriptor.topHitsSize === 'number' && descriptor.topHitsSize > 0
          ? descriptor.topHitsSize
          : 1,
    };
  }

  constructor(descriptor: Partial<ESSearchSourceDescriptor>, inspectorAdapters?: Adapters) {
    const sourceDescriptor = ESSearchSource.createDescriptor(descriptor);
    super(sourceDescriptor, inspectorAdapters);
    this._descriptor = sourceDescriptor;
    this._tooltipFields = this._descriptor.tooltipProperties
      ? this._descriptor.tooltipProperties.map((property) => {
          return this.createField({ fieldName: property });
        })
      : [];
  }

  createField({ fieldName }: { fieldName: string }): ESDocField {
    return new ESDocField({
      fieldName,
      source: this,
      origin: FIELD_ORIGIN.SOURCE,
    });
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
        hasJoins={sourceEditorArgs.hasJoins}
        clearJoins={sourceEditorArgs.clearJoins}
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
        return this.createField({ fieldName: field.name });
      });
    } catch (error) {
      // failed index-pattern retrieval will show up as error-message in the layer-toc-entry
      return [];
    }
  }

  getFieldNames(): string[] {
    return [this._descriptor.geoField];
  }

  isMvt() {
    return this._descriptor.scalingType === SCALING_TYPES.MVT;
  }

  async getImmutableProperties(): Promise<ImmutableSourceProperty[]> {
    let indexPatternName = this.getIndexPatternId();
    let geoFieldType = '';
    try {
      const indexPattern = await this.getIndexPattern();
      indexPatternName = indexPattern.title;
      const geoField = await this._getGeoField();
      geoFieldType = geoField.type;
    } catch (error) {
      // ignore error, title will just default to id
    }

    return [
      {
        label: getDataSourceLabel(),
        value: sourceTitle,
      },
      {
        label: getDataViewLabel(),
        value: indexPatternName,
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
    searchFilters: VectorSourceRequestMeta,
    registerCancelCallback: (callback: () => void) => void
  ) {
    const { topHitsSplitField: topHitsSplitFieldName, topHitsSize } = this._descriptor;

    if (!topHitsSplitFieldName) {
      throw new Error('Cannot _getTopHits without topHitsSplitField');
    }

    const indexPattern: DataView = await this.getIndexPattern();

    const fieldNames = searchFilters.fieldNames.filter(
      (fieldName) => fieldName !== this._descriptor.geoField
    );
    const { docValueFields, sourceOnlyFields, scriptFields } = getDocValueAndSourceFields(
      indexPattern,
      fieldNames,
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

    const topHitsSplitField: DataViewField = getField(indexPattern, topHitsSplitFieldName);
    const cardinalityAgg = { precision_threshold: 1 };
    const termsAgg = {
      size: DEFAULT_MAX_BUCKETS_LIMIT,
      shard_size: DEFAULT_MAX_BUCKETS_LIMIT,
    };

    const searchSource = await this.makeSearchSource(searchFilters, 0);
    searchSource.setField('trackTotalHits', false);
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

    const resp = await this._runEsQuery({
      requestId: this.getId(),
      requestName: layerName,
      searchSource,
      registerCancelCallback,
      requestDescription: 'Elasticsearch document top hits request',
      searchSessionId: searchFilters.searchSessionId,
      executionContext: makePublicExecutionContext('es_search_source:top_hits'),
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
      },
    };
  }

  // searchFilters.fieldNames contains geo field and any fields needed for styling features
  // Performs Elasticsearch search request being careful to pull back only required fields to minimize response size
  async _getSearchHits(
    layerName: string,
    searchFilters: VectorSourceRequestMeta,
    registerCancelCallback: (callback: () => void) => void
  ) {
    const indexPattern = await this.getIndexPattern();

    const fieldNames = searchFilters.fieldNames.filter(
      (fieldName) => fieldName !== this._descriptor.geoField
    );
    const { docValueFields, sourceOnlyFields } = getDocValueAndSourceFields(
      indexPattern,
      fieldNames,
      'epoch_millis'
    );

    const initialSearchContext = { docvalue_fields: docValueFields }; // Request fields in docvalue_fields insted of _source

    // Use Kibana global time extent instead of timeslice extent when all documents for global time extent can be loaded
    // to allow for client-side masking of timeslice
    const searchFiltersWithoutTimeslice = { ...searchFilters };
    delete searchFiltersWithoutTimeslice.timeslice;
    const useSearchFiltersWithoutTimeslice =
      searchFilters.timeslice !== undefined &&
      (await this.canLoadAllDocuments(searchFiltersWithoutTimeslice, registerCancelCallback));

    const maxResultWindow = await this.getMaxResultWindow();
    const searchSource = await this.makeSearchSource(
      useSearchFiltersWithoutTimeslice ? searchFiltersWithoutTimeslice : searchFilters,
      maxResultWindow,
      initialSearchContext
    );
    searchSource.setField('trackTotalHits', maxResultWindow + 1);
    searchSource.setField('fieldsFromSource', searchFilters.fieldNames); // Setting "fields" filters out unused scripted fields
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
      requestName: layerName,
      searchSource,
      registerCancelCallback,
      requestDescription: 'Elasticsearch document request',
      searchSessionId: searchFilters.searchSessionId,
      executionContext: makePublicExecutionContext('es_search_source:doc_search'),
    });

    const isTimeExtentForTimeslice =
      searchFilters.timeslice !== undefined && !useSearchFiltersWithoutTimeslice;
    return {
      hits: resp.hits.hits.reverse(), // Reverse hits so top documents by sort are drawn on top
      meta: {
        resultsCount: resp.hits.hits.length,
        areResultsTrimmed: isTotalHitsGreaterThan(resp.hits.total, resp.hits.hits.length),
        timeExtent: isTimeExtentForTimeslice
          ? searchFilters.timeslice
          : timerangeToTimeextent(searchFilters.timeFilters),
        isTimeExtentForTimeslice,
      },
    };
  }

  _isTopHits(): boolean {
    const { scalingType, topHitsSplitField } = this._descriptor;
    return !!(scalingType === SCALING_TYPES.TOP_HITS && topHitsSplitField);
  }

  async getSourceIndexList(): Promise<string[]> {
    await this.getIndexPattern();
    if (!(this.indexPattern && this.indexPattern.title)) {
      return [];
    }
    try {
      const { success, matchingIndexes } = await getMatchingIndexes(this.indexPattern.title);
      return success ? matchingIndexes : [];
    } catch (e) {
      // Fail silently
      return [];
    }
  }

  async supportsFeatureEditing(): Promise<boolean> {
    const matchingIndexes = await this.getSourceIndexList();
    // For now we only support 1:1 index-pattern:index matches
    return matchingIndexes.length === 1;
  }

  async getDefaultFields(): Promise<Record<string, Record<string, string>>> {
    if (!(await this._isDrawingIndex())) {
      return {};
    }
    const user = await getSecurityService()?.authc.getCurrentUser();
    const timestamp = new Date().toISOString();
    return {
      created: {
        ...(user ? { user: user.username } : {}),
        '@timestamp': timestamp,
      },
    };
  }

  async _isDrawingIndex(): Promise<boolean> {
    await this.getIndexPattern();
    if (!(this.indexPattern && this.indexPattern.title)) {
      return false;
    }
    const { success, isDrawingIndex } = await getIsDrawLayer(this.indexPattern.title);
    return success && isDrawingIndex;
  }

  _hasSort(): boolean {
    const { sortField, sortOrder } = this._descriptor;
    return !!sortField && !!sortOrder;
  }

  async getMaxResultWindow(): Promise<number> {
    const indexPattern = await this.getIndexPattern();
    const indexSettings = await loadIndexSettings(indexPattern.title);
    return indexSettings.maxResultWindow;
  }

  async getGeoJsonWithMeta(
    layerName: string,
    searchFilters: VectorSourceRequestMeta,
    registerCancelCallback: (callback: () => void) => void,
    isRequestStillActive: () => boolean
  ): Promise<GeoJsonWithMeta> {
    const indexPattern = await this.getIndexPattern();

    const { hits, meta } = this._isTopHits()
      ? await this._getTopHits(layerName, searchFilters, registerCancelCallback)
      : await this._getSearchHits(layerName, searchFilters, registerCancelCallback);

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
    const epochMillisFields = searchFilters.fieldNames.filter((fieldName) => {
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

  async _loadTooltipProperties(docId: string | number, index: string, indexPattern: DataView) {
    if (this._tooltipFields.length === 0) {
      return {};
    }

    const { docValueFields } = getDocValueAndSourceFields(
      indexPattern,
      this._getTooltipPropertyNames(),
      'strict_date_optional_time'
    );

    const initialSearchContext = { docvalue_fields: docValueFields }; // Request fields in docvalue_fields insted of _source
    const searchService = getSearchService();
    const searchSource = await searchService.searchSource.create(initialSearchContext as object);
    searchSource.setField('trackTotalHits', false);

    searchSource.setField('index', indexPattern);
    searchSource.setField('size', 1);

    const query = {
      language: 'kuery',
      query: `_id:"${docId}" and _index:"${index}"`,
    };

    searchSource.setField('query', query);
    searchSource.setField('fieldsFromSource', this._getTooltipPropertyNames());

    const { rawResponse: resp } = await searchSource
      .fetch$({
        legacyHitsTotal: false,
        executionContext: makePublicExecutionContext('es_search_source:load_tooltip_properties'),
      })
      .toPromise();

    const hit = _.get(resp, 'hits.hits[0]');
    if (!hit) {
      throw new Error(
        i18n.translate('xpack.maps.source.esSearch.loadTooltipPropertiesErrorMsg', {
          defaultMessage: 'Unable to find document, _id: {docId}',
          values: { docId },
        })
      );
    }

    const properties = indexPattern.flattenHit(hit);
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

  async getTooltipProperties(properties: GeoJsonProperties): Promise<ITooltipProperty[]> {
    if (properties === null) {
      throw new Error('properties cannot be null');
    }
    const indexPattern = await this.getIndexPattern();
    const propertyValues = await this._loadTooltipProperties(
      properties._id,
      properties._index,
      indexPattern
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
      return this.createField({ fieldName: field.name });
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
      filterByMapBounds: this._descriptor.filterByMapBounds,
      sortField: this._descriptor.sortField,
      sortOrder: this._descriptor.sortOrder,
      scalingType: this._descriptor.scalingType,
      topHitsSplitField: this._descriptor.topHitsSplitField,
      topHitsSize: this._descriptor.topHitsSize,
    };
  }

  async getPreIndexedShape(properties: GeoJsonProperties): Promise<PreIndexedShape | null> {
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

  getJoinsDisabledReason(): string | null {
    let reason;
    if (this._descriptor.scalingType === SCALING_TYPES.CLUSTERS) {
      reason = i18n.translate('xpack.maps.source.esSearch.joinsDisabledReason', {
        defaultMessage: 'Joins are not supported when scaling by clusters',
      });
    } else if (this._descriptor.scalingType === SCALING_TYPES.MVT) {
      reason = i18n.translate('xpack.maps.source.esSearch.joinsDisabledReasonMvt', {
        defaultMessage: 'Joins are not supported when scaling by vector tiles',
      });
    } else {
      reason = null;
    }
    return reason;
  }

  async _getEditableIndex(): Promise<string> {
    const indexList = await this.getSourceIndexList();
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

  async addFeature(
    geometry: Geometry | Position[],
    defaultFields: Record<string, Record<string, string>>
  ) {
    const index = await this._getEditableIndex();
    await addFeatureToIndex(index, geometry, this.getGeoFieldName(), defaultFields);
  }

  async deleteFeature(featureId: string) {
    const index = await this._getEditableIndex();
    await deleteFeatureFromIndex(index, featureId);
  }

  getTileSourceLayer(): string {
    return 'hits';
  }

  async getTileUrl(searchFilters: VectorSourceRequestMeta, refreshToken: string): Promise<string> {
    const indexPattern = await this.getIndexPattern();
    const indexSettings = await loadIndexSettings(indexPattern.title);

    const fieldNames = searchFilters.fieldNames.filter(
      (fieldName) => fieldName !== this._descriptor.geoField
    );
    const { docValueFields, sourceOnlyFields } = getDocValueAndSourceFields(
      indexPattern,
      fieldNames,
      'epoch_millis'
    );

    const initialSearchContext = { docvalue_fields: docValueFields }; // Request fields in docvalue_fields insted of _source

    const searchSource = await this.makeSearchSource(
      searchFilters,
      indexSettings.maxResultWindow,
      initialSearchContext
    );
    searchSource.setField('fieldsFromSource', searchFilters.fieldNames); // Setting "fields" filters out unused scripted fields
    if (sourceOnlyFields.length === 0) {
      searchSource.setField('source', false); // do not need anything from _source
    } else {
      searchSource.setField('source', sourceOnlyFields);
    }
    if (this._hasSort()) {
      searchSource.setField('sort', this._buildEsSort());
    }

    const mvtUrlServicePath = getHttp().basePath.prepend(
      `/${GIS_API_PATH}/${MVT_GETTILE_API_PATH}/{z}/{x}/{y}.pbf`
    );

    return `${mvtUrlServicePath}\
?geometryFieldName=${this._descriptor.geoField}\
&index=${indexPattern.title}\
&requestBody=${encodeMvtResponseBody(searchSource.getSearchRequestBody())}\
&token=${refreshToken}`;
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

  async canLoadAllDocuments(
    searchFilters: VectorSourceRequestMeta,
    registerCancelCallback: (callback: () => void) => void
  ) {
    const abortController = new AbortController();
    registerCancelCallback(() => abortController.abort());
    const maxResultWindow = await this.getMaxResultWindow();
    const searchSource = await this.makeSearchSource(searchFilters, 0);
    searchSource.setField('trackTotalHits', maxResultWindow + 1);
    const { rawResponse: resp } = await searchSource
      .fetch$({
        abortSignal: abortController.signal,
        sessionId: searchFilters.searchSessionId,
        legacyHitsTotal: false,
        executionContext: makePublicExecutionContext('es_search_source:all_doc_counts'),
      })
      .toPromise();
    return !isTotalHitsGreaterThan(resp.hits.total as unknown as TotalHits, maxResultWindow);
  }
}

registerSource({
  ConstructorFunction: ESSearchSource,
  type: SOURCE_TYPES.ES_SEARCH,
});
