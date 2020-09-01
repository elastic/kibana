/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React from 'react';

import { AbstractESSource } from '../es_source';
import { getSearchService } from '../../../kibana_services';
import { hitsToGeoJson } from '../../../../common/elasticsearch_geo_utils';
import { UpdateSourceEditor } from './update_source_editor';
import {
  SOURCE_TYPES,
  ES_GEO_FIELD_TYPE,
  DEFAULT_MAX_BUCKETS_LIMIT,
  SORT_ORDER,
  SCALING_TYPES,
  VECTOR_SHAPE_TYPE,
} from '../../../../common/constants';
import { i18n } from '@kbn/i18n';
import { getDataSourceLabel } from '../../../../common/i18n_getters';
import { getSourceFields } from '../../../index_pattern_util';
import { loadIndexSettings } from './load_index_settings';
import uuid from 'uuid/v4';

import { DEFAULT_FILTER_BY_MAP_BOUNDS } from './constants';
import { ESDocField } from '../../fields/es_doc_field';
import { getField, addFieldToDSL } from '../../util/es_agg_utils';
import { registerSource } from '../source_registry';

export const sourceTitle = i18n.translate('xpack.maps.source.esSearchTitle', {
  defaultMessage: 'Documents',
});

function getDocValueAndSourceFields(indexPattern, fieldNames) {
  const docValueFields = [];
  const sourceOnlyFields = [];
  const scriptFields = {};
  fieldNames.forEach((fieldName) => {
    const field = getField(indexPattern, fieldName);
    if (field.scripted) {
      scriptFields[field.name] = {
        script: {
          source: field.script,
          lang: field.lang,
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

export class ESSearchSource extends AbstractESSource {
  static type = SOURCE_TYPES.ES_SEARCH;

  static createDescriptor(descriptor) {
    return {
      ...descriptor,
      id: descriptor.id ? descriptor.id : uuid(),
      type: ESSearchSource.type,
      indexPatternId: descriptor.indexPatternId,
      geoField: descriptor.geoField,
      filterByMapBounds: _.get(descriptor, 'filterByMapBounds', DEFAULT_FILTER_BY_MAP_BOUNDS),
      tooltipProperties: _.get(descriptor, 'tooltipProperties', []),
      sortField: _.get(descriptor, 'sortField', ''),
      sortOrder: _.get(descriptor, 'sortOrder', SORT_ORDER.DESC),
      scalingType: _.get(descriptor, 'scalingType', SCALING_TYPES.LIMIT),
      topHitsSplitField: descriptor.topHitsSplitField,
      topHitsSize: _.get(descriptor, 'topHitsSize', 1),
    };
  }

  constructor(descriptor, inspectorAdapters) {
    super(ESSearchSource.createDescriptor(descriptor), inspectorAdapters);

    this._tooltipFields = this._descriptor.tooltipProperties.map((property) =>
      this.createField({ fieldName: property })
    );
  }

  createField({ fieldName }) {
    return new ESDocField({
      fieldName,
      source: this,
    });
  }

  renderSourceSettingsEditor({ onChange }) {
    const getGeoField = () => {
      return this._getGeoField();
    };
    return (
      <UpdateSourceEditor
        source={this}
        indexPatternId={this.getIndexPatternId()}
        getGeoField={getGeoField}
        onChange={onChange}
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

  async getFields() {
    try {
      const indexPattern = await this.getIndexPattern();
      return indexPattern.fields
        .filter((field) => {
          // Ensure fielddata is enabled for field.
          // Search does not request _source
          return field.aggregatable;
        })
        .map((field) => {
          return this.createField({ fieldName: field.name });
        });
    } catch (error) {
      // failed index-pattern retrieval will show up as error-message in the layer-toc-entry
      return [];
    }
  }

  getFieldNames() {
    return [this._descriptor.geoField];
  }

  async getImmutableProperties() {
    let indexPatternTitle = this.getIndexPatternId();
    let geoFieldType = '';
    try {
      const indexPattern = await this.getIndexPattern();
      indexPatternTitle = indexPattern.title;
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
        value: indexPatternTitle,
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
  _buildEsSort() {
    const { sortField, sortOrder } = this._descriptor;
    return [
      {
        [sortField]: {
          order: sortOrder,
        },
      },
    ];
  }

  async _getTopHits(layerName, searchFilters, registerCancelCallback) {
    const { topHitsSplitField: topHitsSplitFieldName, topHitsSize } = this._descriptor;

    const indexPattern = await this.getIndexPattern();

    const { docValueFields, sourceOnlyFields, scriptFields } = getDocValueAndSourceFields(
      indexPattern,
      searchFilters.fieldNames
    );
    const topHits = {
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

    const topHitsSplitField = getField(indexPattern, topHitsSplitFieldName);
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

    const allHits = [];
    const entityBuckets = _.get(resp, 'aggregations.entitySplit.buckets', []);
    const totalEntities = _.get(resp, 'aggregations.totalEntities.value', 0);
    // can not compare entityBuckets.length to totalEntities because totalEntities is an approximate
    const areEntitiesTrimmed = entityBuckets.length >= DEFAULT_MAX_BUCKETS_LIMIT;
    let areTopHitsTrimmed = false;
    entityBuckets.forEach((entityBucket) => {
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
  async _getSearchHits(layerName, searchFilters, maxResultWindow, registerCancelCallback) {
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

  _isTopHits() {
    const { scalingType, topHitsSplitField } = this._descriptor;
    return !!(scalingType === SCALING_TYPES.TOP_HITS && topHitsSplitField);
  }

  _hasSort() {
    const { sortField, sortOrder } = this._descriptor;
    return !!sortField && !!sortOrder;
  }

  async getMaxResultWindow() {
    const indexPattern = await this.getIndexPattern();
    const indexSettings = await loadIndexSettings(indexPattern.title);
    return indexSettings.maxResultWindow;
  }

  async getGeoJsonWithMeta(layerName, searchFilters, registerCancelCallback) {
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
    const flattenHit = (hit) => {
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
        geoField.type,
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

  canFormatFeatureProperties() {
    return this._tooltipFields.length > 0;
  }

  async _loadTooltipProperties(docId, index, indexPattern) {
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
    indexPattern.metaFields.forEach((metaField) => {
      if (!this._getTooltipPropertyNames().includes(metaField)) {
        delete properties[metaField];
      }
    });
    return properties;
  }

  async filterAndFormatPropertiesToHtml(properties) {
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

  isFilterByMapBounds() {
    return this._descriptor.scalingType === SCALING_TYPES.CLUSTER
      ? true
      : this._descriptor.filterByMapBounds;
  }

  async getLeftJoinFields() {
    const indexPattern = await this.getIndexPattern();
    // Left fields are retrieved from _source.
    return getSourceFields(indexPattern.fields).map((field) =>
      this.createField({ fieldName: field.name })
    );
  }

  async getSupportedShapeTypes() {
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

  getSourceTooltipContent(sourceDataRequest) {
    const featureCollection = sourceDataRequest ? sourceDataRequest.getData() : null;
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
        areResultsTrimmed: meta.areEntitiesTrimmed,
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

  getSyncMeta() {
    return {
      sortField: this._descriptor.sortField,
      sortOrder: this._descriptor.sortOrder,
      scalingType: this._descriptor.scalingType,
      topHitsSplitField: this._descriptor.topHitsSplitField,
      topHitsSize: this._descriptor.topHitsSize,
    };
  }

  async getPreIndexedShape(properties) {
    const geoField = await this._getGeoField();
    return {
      index: properties._index, // Can not use index pattern title because it may reference many indices
      id: properties._id,
      path: geoField.name,
    };
  }

  getJoinsDisabledReason() {
    return this._descriptor.scalingType === SCALING_TYPES.CLUSTERS
      ? i18n.translate('xpack.maps.source.esSearch.joinsDisabledReason', {
          defaultMessage: 'Joins are not supported when scaling by clusters',
        })
      : null;
  }
}

registerSource({
  ConstructorFunction: ESSearchSource,
  type: SOURCE_TYPES.ES_SEARCH,
});
