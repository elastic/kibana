/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import turfBbox from '@turf/bbox';
import { multiPoint } from '@turf/helpers';

import { UpdateSourceEditor } from './update_source_editor';
import { i18n } from '@kbn/i18n';
import { SOURCE_TYPES, VECTOR_SHAPE_TYPE } from '../../../../common/constants';
import { getDataSourceLabel, getDataViewLabel } from '../../../../common/i18n_getters';
import { convertToLines } from './convert_to_lines';
import { AbstractESAggSource } from '../es_agg_source';
import { registerSource } from '../source_registry';
import { turfBboxToBounds } from '../../../../common/elasticsearch_util';
import { DataRequestAbortError } from '../../util/data_request';
import { makePublicExecutionContext } from '../../../util';

const MAX_GEOTILE_LEVEL = 29;

export const sourceTitle = i18n.translate('xpack.maps.source.pewPewTitle', {
  defaultMessage: 'Point to point',
});

export class ESPewPewSource extends AbstractESAggSource {
  static type = SOURCE_TYPES.ES_PEW_PEW;

  static createDescriptor(descriptor) {
    const normalizedDescriptor = AbstractESAggSource.createDescriptor(descriptor);
    return {
      ...normalizedDescriptor,
      type: ESPewPewSource.type,
      indexPatternId: descriptor.indexPatternId,
      sourceGeoField: descriptor.sourceGeoField,
      destGeoField: descriptor.destGeoField,
    };
  }

  renderSourceSettingsEditor({ onChange }) {
    return (
      <UpdateSourceEditor
        indexPatternId={this.getIndexPatternId()}
        onChange={onChange}
        metrics={this._descriptor.metrics}
        applyGlobalQuery={this._descriptor.applyGlobalQuery}
      />
    );
  }

  isFilterByMapBounds() {
    return true;
  }

  showJoinEditor() {
    return false;
  }

  isGeoGridPrecisionAware() {
    return true;
  }

  async getSupportedShapeTypes() {
    return [VECTOR_SHAPE_TYPE.LINE];
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
        value: sourceTitle,
      },
      {
        label: getDataViewLabel(),
        value: indexPatternTitle,
      },
      {
        label: i18n.translate('xpack.maps.source.pewPew.sourceGeoFieldLabel', {
          defaultMessage: 'Source',
        }),
        value: this._descriptor.sourceGeoField,
      },
      {
        label: i18n.translate('xpack.maps.source.pewPew.destGeoFieldLabel', {
          defaultMessage: 'Destination',
        }),
        value: this._descriptor.destGeoField,
      },
    ];
  }

  getGeoGridPrecision(zoom) {
    const targetGeotileLevel = Math.ceil(zoom) + 2;
    return Math.min(targetGeotileLevel, MAX_GEOTILE_LEVEL);
  }

  async getGeoJsonWithMeta(layerName, searchFilters, registerCancelCallback) {
    const indexPattern = await this.getIndexPattern();
    const searchSource = await this.makeSearchSource(searchFilters, 0);
    searchSource.setField('trackTotalHits', false);
    searchSource.setField('aggs', {
      destSplit: {
        terms: {
          script: {
            source: `doc['${this._descriptor.destGeoField}'].value.toString()`,
            lang: 'painless',
          },
          order: {
            _count: 'desc',
          },
          size: 100,
        },
        aggs: {
          sourceGrid: {
            geotile_grid: {
              field: this._descriptor.sourceGeoField,
              precision: searchFilters.geogridPrecision,
              size: 500,
            },
            aggs: {
              sourceCentroid: {
                geo_centroid: {
                  field: this._descriptor.sourceGeoField,
                },
              },
              ...this.getValueAggsDsl(indexPattern),
            },
          },
        },
      },
    });

    // pewpew source is often used with security solution index-pattern
    // Some underlying indices may not contain geo fields
    // Filter out documents without geo fields to avoid shard failures for those indices
    searchSource.setField('filter', [
      ...searchSource.getField('filter'),
      // destGeoField exists ensured by buffer filter
      // so only need additional check for sourceGeoField
      {
        exists: {
          field: this._descriptor.sourceGeoField,
        },
      },
    ]);

    const esResponse = await this._runEsQuery({
      requestId: this.getId(),
      requestName: layerName,
      searchSource,
      registerCancelCallback,
      requestDescription: i18n.translate('xpack.maps.source.pewPew.inspectorDescription', {
        defaultMessage: 'Source-destination connections request',
      }),
      searchSessionId: searchFilters.searchSessionId,
      executionContext: makePublicExecutionContext('es_pew_pew_source:connections'),
    });

    const { featureCollection } = convertToLines(esResponse);

    return {
      data: featureCollection,
      meta: {
        areResultsTrimmed: false,
      },
    };
  }

  getGeoFieldName() {
    return this._descriptor.destGeoField;
  }

  async getBoundsForFilters(boundsFilters, registerCancelCallback) {
    const searchSource = await this.makeSearchSource(boundsFilters, 0);
    searchSource.setField('trackTotalHits', false);
    searchSource.setField('aggs', {
      destFitToBounds: {
        geo_bounds: {
          field: this._descriptor.destGeoField,
        },
      },
      sourceFitToBounds: {
        geo_bounds: {
          field: this._descriptor.sourceGeoField,
        },
      },
    });

    const corners = [];
    try {
      const abortController = new AbortController();
      registerCancelCallback(() => abortController.abort());
      const esResp = await searchSource.fetch({
        abortSignal: abortController.signal,
        legacyHitsTotal: false,
        executionContext: makePublicExecutionContext('es_pew_pew_source:bounds'),
      });
      if (esResp.aggregations.destFitToBounds.bounds) {
        corners.push([
          esResp.aggregations.destFitToBounds.bounds.top_left.lon,
          esResp.aggregations.destFitToBounds.bounds.top_left.lat,
        ]);
        corners.push([
          esResp.aggregations.destFitToBounds.bounds.bottom_right.lon,
          esResp.aggregations.destFitToBounds.bounds.bottom_right.lat,
        ]);
      }
      if (esResp.aggregations.sourceFitToBounds.bounds) {
        corners.push([
          esResp.aggregations.sourceFitToBounds.bounds.top_left.lon,
          esResp.aggregations.sourceFitToBounds.bounds.top_left.lat,
        ]);
        corners.push([
          esResp.aggregations.sourceFitToBounds.bounds.bottom_right.lon,
          esResp.aggregations.sourceFitToBounds.bounds.bottom_right.lat,
        ]);
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new DataRequestAbortError();
      }

      return null;
    }

    if (corners.length === 0) {
      return null;
    }

    return turfBboxToBounds(turfBbox(multiPoint(corners)));
  }

  hasTooltipProperties() {
    return true;
  }
}

registerSource({
  ConstructorFunction: ESPewPewSource,
  type: SOURCE_TYPES.ES_PEW_PEW,
});
