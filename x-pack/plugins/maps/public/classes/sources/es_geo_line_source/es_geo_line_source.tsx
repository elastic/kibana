/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import uuid from 'uuid/v4';

import { i18n } from '@kbn/i18n';
import {
  FIELD_ORIGIN,
  SOURCE_TYPES,
  DEFAULT_MAX_BUCKETS_LIMIT,
  VECTOR_SHAPE_TYPE,
} from '../../../../common/constants';
import { getDataSourceLabel } from '../../../../common/i18n_getters';
import { AbstractESAggSource, DEFAULT_METRIC } from '../es_agg_source';
import { DataRequestAbortError } from '../../util/data_request';
import { registerSource } from '../source_registry';
import { makeESBbox } from '../../../../common/elasticsearch_geo_utils';
import { getField, addFieldToDSL } from '../../util/es_agg_utils';
import { convertToGeoJson } from './convert_to_geojson';
import { ESDocField } from '../../fields/es_doc_field';

export const geoLineTitle = i18n.translate('xpack.maps.source.esGeoLineTitle', {
  defaultMessage: 'Tracks',
});

export interface GeoLineSourceConfig {
  indexPatternId: string;
  geoField: string;
  splitField: string;
  sortField: string;
}

export class ESGeoLineSource extends AbstractESAggSource {
  static createDescriptor(sourceConfig: GeoLineSourceConfig) {
    return {
      type: SOURCE_TYPES.ES_GEO_LINE,
      id: uuid(),
      metrics: [DEFAULT_METRIC],
      ...sourceConfig,
    };
  }

  renderSourceSettingsEditor({ onChange }) {
    return null;
  }

  getSyncMeta() {
    return {
      requestType: this._descriptor.requestType,
    };
  }

  async getImmutableProperties() {
    let indexPatternTitle = this.getIndexPatternId();
    try {
      const indexPattern = await this.getIndexPattern();
      indexPatternTitle = indexPattern.title;
    } catch (error) {
      // ignore error, title will just default to id
    }

    return [
      {
        label: getDataSourceLabel(),
        value: geoLineTitle,
      },
      {
        label: i18n.translate('xpack.maps.source.esGeoLine.indexPatternLabel', {
          defaultMessage: 'Index pattern',
        }),
        value: indexPatternTitle,
      },
      {
        label: i18n.translate('xpack.maps.source.esGeoLine.geospatialFieldLabel', {
          defaultMessage: 'Geospatial field',
        }),
        value: this._descriptor.geoField,
      },
    ];
  }

  getFieldNames() {
    return [
      ...this.getMetricFields().map((esAggMetricField) => esAggMetricField.getName()),
      this._descriptor.splitField,
      this._descriptor.sortField,
    ];
  }

  async getFields() {
    return [
      ...this.getMetricFields(),
      new ESDocField({
        fieldName: this._descriptor.splitField,
        source: this,
        origin: FIELD_ORIGIN.SOURCE,
        canReadFromGeoJson: true,
      }),
    ];
  }

  isGeoGridPrecisionAware() {
    return false;
  }

  showJoinEditor() {
    return false;
  }

  async getGeoJsonWithMeta(layerName, searchFilters, registerCancelCallback, isRequestStillActive) {
    const indexPattern = await this.getIndexPattern();
    const searchSource = await this.makeSearchSource(searchFilters, 0);

    const splitField = getField(indexPattern, this._descriptor.splitField);
    const cardinalityAgg = { precision_threshold: 1 };
    const termsAgg = {
      size: DEFAULT_MAX_BUCKETS_LIMIT,
      shard_size: DEFAULT_MAX_BUCKETS_LIMIT,
    };
    searchSource.setField('aggs', {
      totalEntities: {
        cardinality: addFieldToDSL(cardinalityAgg, splitField),
      },
      entitySplit: {
        terms: addFieldToDSL(termsAgg, splitField),
        aggs: {
          path: {
            geo_line: {
              geo_point: {
                field: this._descriptor.geoField,
              },
              sort: {
                field: this._descriptor.sortField,
              },
            },
          },
        },
      },
    });

    const resp = await this._runEsQuery({
      requestId: this.getId(),
      requestName: layerName,
      searchSource,
      registerCancelCallback,
      requestDescription: i18n.translate('xpack.maps.source.esGeoLine.requestLabel', {
        defaultMessage: 'Elasticsearch tracks request',
      }),
    });

    return {
      data: convertToGeoJson(resp, this._descriptor.splitField).featureCollection,
      meta: {
        areResultsTrimmed: false,
      },
    };
  }

  isFilterByMapBounds() {
    return true;
  }

  canFormatFeatureProperties() {
    return true;
  }

  async filterAndFormatPropertiesToHtml(properties) {
    return await this.filterAndFormatPropertiesToHtmlForMetricFields(properties);
  }

  async getSupportedShapeTypes() {
    return [VECTOR_SHAPE_TYPE.LINE];
  }
}

registerSource({
  ConstructorFunction: ESGeoLineSource,
  type: SOURCE_TYPES.ES_GEO_LINE,
});
