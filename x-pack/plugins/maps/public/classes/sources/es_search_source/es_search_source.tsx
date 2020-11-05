/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React, { ReactElement } from 'react';
import rison from 'rison-node';

import { i18n } from '@kbn/i18n';
import { IFieldType, IndexPattern } from 'src/plugins/data/public';
import { FeatureCollection, GeoJsonProperties } from 'geojson';
import { AbstractESSource } from '../es_source';
import { getHttp, getSearchService } from '../../../kibana_services';
import { addFieldToDSL, getField, hitsToGeoJson } from '../../../../common/elasticsearch_util';
// @ts-expect-error
import { UpdateSourceEditor } from './update_source_editor';

import {
  DEFAULT_MAX_BUCKETS_LIMIT,
  ES_GEO_FIELD_TYPE,
  FIELD_ORIGIN,
  GIS_API_PATH,
  MVT_GETTILE_API_PATH,
  MVT_SOURCE_LAYER_NAME,
  SCALING_TYPES,
  SOURCE_TYPES,
  VECTOR_SHAPE_TYPE,
} from '../../../../common/constants';
import { getDataSourceLabel } from '../../../../common/i18n_getters';
import { getSourceFields } from '../../../index_pattern_util';
import { loadIndexSettings } from './load_index_settings';

import { DEFAULT_FILTER_BY_MAP_BOUNDS } from './constants';
import { ESDocField } from '../../fields/es_doc_field';

import { registerSource } from '../source_registry';
import {
  ESSearchSourceDescriptor,
  VectorSourceRequestMeta,
  VectorSourceSyncMeta,
} from '../../../../common/descriptor_types';
import { Adapters } from '../../../../../../../src/plugins/inspector/common/adapters';
import { ImmutableSourceProperty, PreIndexedShape, SourceEditorArgs } from '../source';
import { IField } from '../../fields/field';
import {
  GeoJsonWithMeta,
  ITiledSingleLayerVectorSource,
  SourceTooltipConfig,
} from '../vector_source';
import { ITooltipProperty } from '../../tooltips/tooltip_property';
import { DataRequest } from '../../util/data_request';
import { SortDirection, SortDirectionNumeric } from '../../../../../../../src/plugins/data/common';
import { isValidStringConfig } from '../../util/valid_string_config';

export const sourceTitle = i18n.translate('xpack.maps.source.esSearchTitle', {
  defaultMessage: 'Documents',
});

export interface ScriptField {
  source: string;
  lang: string;
}

function getDocValueAndSourceFields(
  indexPattern: IndexPattern,
  fieldNames: string[]
): {
  docValueFields: Array<string | { format: string; field: string }>;
  sourceOnlyFields: string[];
  scriptFields: Record<string, { script: ScriptField }>;
} {
  const docValueFields: Array<string | { format: string; field: string }> = [];
  const sourceOnlyFields: string[] = [];
  const scriptFields: Record<string, { script: ScriptField }> = {};
  fieldNames.forEach((fieldName) => {
    const field = getField(indexPattern, fieldName);
    if (field.scripted) {
      scriptFields[field.name] = {
        script: {
          source: field.script || '',
          lang: field.lang || '',
        },
      };
    } else if (field.readFromDocValues) {
      const docValueField =
        field.type === 'date'
          ? {
              field: fieldName,
              format: 'epoch_millis',
            }
          : fieldName;
      docValueFields.push(docValueField);
    } else {
      sourceOnlyFields.push(fieldName);
    }
  });

  return { docValueFields, sourceOnlyFields, scriptFields };
}

export class ESSearchSource extends AbstractESSource implements ITiledSingleLayerVectorSource {
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
        : SCALING_TYPES.LIMIT,
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
      canReadFromGeoJson: this._descriptor.scalingType !== SCALING_TYPES.MVT,
    });
  }

  renderSourceSettingsEditor(sourceEditorArgs: SourceEditorArgs): ReactElement<any> | null {
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
        topHitsSplitField={this._descriptor.topHitsSplitField}
        topHitsSize={this._descriptor.topHitsSize}
      />
    );
  }

  async getFields(): Promise<IField[]> {
    try {
      const indexPattern = await this.getIndexPattern();
      const fields: IFieldType[] = indexPattern.fields.filter((field) => {
        // Ensure fielddata is enabled for field.
        // Search does not request _source
        return field.aggregatable;
      });

      return fields.map(
        (field): IField => {
          return this.createField({ fieldName: field.name });
        }
      );
    } catch (error) {
      // failed index-pattern retrieval will show up as error-message in the layer-toc-entry
      return [];
    }
  }

  getFieldNames(): string[] {
    return [this._descriptor.geoField];
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
        label: i18n.translate('xpack.maps.source.esSearch.indexPatternLabel', {
          defaultMessage: `Index pattern`,
        }),
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

    const indexPattern: IndexPattern = await this.getIndexPattern();

    const { docValueFields, sourceOnlyFields, scriptFields } = getDocValueAndSourceFields(
      indexPattern,
      searchFilters.fieldNames
    );
    const topHits: {
      size: number;
      script_fields: Record<string, { script: ScriptField }>;
      docvalue_fields: Array<string | { format: string; field: string }>;
      _source?: boolean | { includes: string[] };
      sort?: Array<Record<string, SortDirectionNumeric>>;
    } = {
      size: topHitsSize,
      script_fields: scriptFields,
      docvalue_fields: docValueFields,
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

    const topHitsSplitField: IFieldType = getField(indexPattern, topHitsSplitFieldName);
    const cardinalityAgg = { precision_threshold: 1 };
    const termsAgg = {
      size: DEFAULT_MAX_BUCKETS_LIMIT,
      shard_size: DEFAULT_MAX_BUCKETS_LIMIT,
    };

    const searchSource = await this.makeSearchSource(searchFilters, 0);
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

    const resp = await this._runEsQuery({
      requestId: this.getId(),
      requestName: layerName,
      searchSource,
      registerCancelCallback,
      requestDescription: 'Elasticsearch document top hits request',
    });

    const allHits: any[] = [];
    const entityBuckets = _.get(resp, 'aggregations.entitySplit.buckets', []);
    const totalEntities = _.get(resp, 'aggregations.totalEntities.value', 0);
    // can not compare entityBuckets.length to totalEntities because totalEntities is an approximate
    const areEntitiesTrimmed = entityBuckets.length >= DEFAULT_MAX_BUCKETS_LIMIT;
    let areTopHitsTrimmed = false;
    entityBuckets.forEach((entityBucket: any) => {
      const total = _.get(entityBucket, 'entityHits.hits.total', 0);
      const hits = _.get(entityBucket, 'entityHits.hits.hits', []);
      // Reverse hits list so top documents by sort are drawn on top
      allHits.push(...hits.reverse());
      if (total > hits.length) {
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
    maxResultWindow: number,
    registerCancelCallback: (callback: () => void) => void
  ) {
    const indexPattern = await this.getIndexPattern();

    const { docValueFields, sourceOnlyFields } = getDocValueAndSourceFields(
      indexPattern,
      searchFilters.fieldNames
    );

    const initialSearchContext = { docvalue_fields: docValueFields }; // Request fields in docvalue_fields insted of _source
    const searchSource = await this.makeSearchSource(
      searchFilters,
      maxResultWindow,
      initialSearchContext
    );
    searchSource.setField('fields', searchFilters.fieldNames); // Setting "fields" filters out unused scripted fields
    if (sourceOnlyFields.length === 0) {
      searchSource.setField('source', false); // do not need anything from _source
    } else {
      searchSource.setField('source', sourceOnlyFields);
    }
    if (this._hasSort()) {
      searchSource.setField('sort', this._buildEsSort());
    }

    const resp = await this._runEsQuery({
      requestId: this.getId(),
      requestName: layerName,
      searchSource,
      registerCancelCallback,
      requestDescription: 'Elasticsearch document request',
    });

    return {
      hits: resp.hits.hits.reverse(), // Reverse hits so top documents by sort are drawn on top
      meta: {
        areResultsTrimmed: resp.hits.total > resp.hits.hits.length,
      },
    };
  }

  _isTopHits(): boolean {
    const { scalingType, topHitsSplitField } = this._descriptor;
    return !!(scalingType === SCALING_TYPES.TOP_HITS && topHitsSplitField);
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

    const indexSettings = await loadIndexSettings(indexPattern.title);

    const { hits, meta } = this._isTopHits()
      ? await this._getTopHits(layerName, searchFilters, registerCancelCallback)
      : await this._getSearchHits(
          layerName,
          searchFilters,
          indexSettings.maxResultWindow,
          registerCancelCallback
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

  canFormatFeatureProperties(): boolean {
    return this._tooltipFields.length > 0;
  }

  async _loadTooltipProperties(docId: string | number, index: string, indexPattern: IndexPattern) {
    if (this._tooltipFields.length === 0) {
      return {};
    }

    const searchService = getSearchService();
    const searchSource = searchService.searchSource.createEmpty();

    searchSource.setField('index', indexPattern);
    searchSource.setField('size', 1);

    const query = {
      language: 'kuery',
      query: `_id:"${docId}" and _index:"${index}"`,
    };

    searchSource.setField('query', query);
    searchSource.setField('fields', this._getTooltipPropertyNames());

    const resp = await searchSource.fetch();

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
    return getSourceFields(indexPattern.fields).map(
      (field): IField => {
        return this.createField({ fieldName: field.name });
      }
    );
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

  getSourceTooltipContent(sourceDataRequest?: DataRequest): SourceTooltipConfig {
    const featureCollection: FeatureCollection | null = sourceDataRequest
      ? (sourceDataRequest.getData() as FeatureCollection)
      : null;
    const meta = sourceDataRequest ? sourceDataRequest.getMeta() : null;
    if (!featureCollection || !meta) {
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
              entityCount: meta.entityCount,
              totalEntities: meta.totalEntities,
            },
          })
        : i18n.translate('xpack.maps.esSearch.topHitsEntitiesCountMsg', {
            defaultMessage: `Found {entityCount} entities.`,
            values: { entityCount: meta.entityCount },
          });
      const docsPerEntityMsg = i18n.translate('xpack.maps.esSearch.topHitsSizeMsg', {
        defaultMessage: `Showing top {topHitsSize} documents per entity.`,
        values: { topHitsSize: this._descriptor.topHitsSize },
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
          values: { count: featureCollection.features.length },
        }),
        areResultsTrimmed: true,
      };
    }

    return {
      tooltipContent: i18n.translate('xpack.maps.esSearch.featureCountMsg', {
        defaultMessage: `Found {count} documents.`,
        values: { count: featureCollection.features.length },
      }),
      areResultsTrimmed: false,
    };
  }

  getSyncMeta(): VectorSourceSyncMeta | null {
    return {
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
        defaultMessage: 'Joins are not supported when scaling by mvt vector tiles',
      });
    } else {
      reason = null;
    }
    return reason;
  }

  getLayerName(): string {
    return MVT_SOURCE_LAYER_NAME;
  }

  async getUrlTemplateWithMeta(
    searchFilters: VectorSourceRequestMeta
  ): Promise<{
    layerName: string;
    urlTemplate: string;
    minSourceZoom: number;
    maxSourceZoom: number;
  }> {
    const indexPattern = await this.getIndexPattern();
    const indexSettings = await loadIndexSettings(indexPattern.title);

    const { docValueFields, sourceOnlyFields } = getDocValueAndSourceFields(
      indexPattern,
      searchFilters.fieldNames
    );

    const initialSearchContext = { docvalue_fields: docValueFields }; // Request fields in docvalue_fields insted of _source

    const searchSource = await this.makeSearchSource(
      searchFilters,
      indexSettings.maxResultWindow,
      initialSearchContext
    );
    searchSource.setField('fields', searchFilters.fieldNames); // Setting "fields" filters out unused scripted fields
    if (sourceOnlyFields.length === 0) {
      searchSource.setField('source', false); // do not need anything from _source
    } else {
      searchSource.setField('source', sourceOnlyFields);
    }
    if (this._hasSort()) {
      searchSource.setField('sort', this._buildEsSort());
    }

    const dsl = await searchSource.getSearchRequestBody();
    const risonDsl = rison.encode(dsl);

    const mvtUrlServicePath = getHttp().basePath.prepend(
      `/${GIS_API_PATH}/${MVT_GETTILE_API_PATH}`
    );

    const geoField = await this._getGeoField();

    const urlTemplate = `${mvtUrlServicePath}?x={x}&y={y}&z={z}&geometryFieldName=${this._descriptor.geoField}&index=${indexPattern.title}&requestBody=${risonDsl}&geoFieldType=${geoField.type}`;
    return {
      layerName: this.getLayerName(),
      minSourceZoom: this.getMinZoom(),
      maxSourceZoom: this.getMaxZoom(),
      urlTemplate,
    };
  }
}

registerSource({
  ConstructorFunction: ESSearchSource,
  type: SOURCE_TYPES.ES_SEARCH,
});
