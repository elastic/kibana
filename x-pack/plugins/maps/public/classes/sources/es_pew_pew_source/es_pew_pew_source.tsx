/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import turfBbox from '@turf/bbox';
import { multiPoint } from '@turf/helpers';
import { Adapters } from '@kbn/inspector-plugin/common/adapters';
import { type Filter, buildExistsFilter } from '@kbn/es-query';
import { lastValueFrom } from 'rxjs';
import type {
  AggregationsGeoBoundsAggregate,
  LatLonGeoLocation,
  TopLeftBottomRightGeoBounds,
} from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import { i18n } from '@kbn/i18n';
// @ts-expect-error
import { UpdateSourceEditor } from './update_source_editor';
import { SOURCE_TYPES, VECTOR_SHAPE_TYPE } from '../../../../common/constants';
import { getDataSourceLabel, getDataViewLabel } from '../../../../common/i18n_getters';
// @ts-expect-error
import { convertToLines } from './convert_to_lines';
import { AbstractESAggSource } from '../es_agg_source';
import { registerSource } from '../source_registry';
import { turfBboxToBounds } from '../../../../common/elasticsearch_util';
import { DataRequestAbortError } from '../../util/data_request';
import { makePublicExecutionContext } from '../../../util';
import { SourceEditorArgs } from '../source';
import {
  ESPewPewSourceDescriptor,
  MapExtent,
  VectorSourceRequestMeta,
} from '../../../../common/descriptor_types';
import { isValidStringConfig } from '../../util/valid_string_config';
import { BoundsRequestMeta, GeoJsonWithMeta } from '../vector_source';

const MAX_GEOTILE_LEVEL = 29;

export const sourceTitle = i18n.translate('xpack.maps.source.pewPewTitle', {
  defaultMessage: 'Point to point',
});

export class ESPewPewSource extends AbstractESAggSource {
  readonly _descriptor: ESPewPewSourceDescriptor;

  static createDescriptor(descriptor: Partial<ESPewPewSourceDescriptor>): ESPewPewSourceDescriptor {
    const normalizedDescriptor = AbstractESAggSource.createDescriptor(descriptor);
    if (!isValidStringConfig(descriptor.sourceGeoField)) {
      throw new Error('Cannot create ESPewPewSourceDescriptor, sourceGeoField is not provided');
    }
    if (!isValidStringConfig(descriptor.destGeoField)) {
      throw new Error('Cannot create ESPewPewSourceDescriptor, destGeoField is not provided');
    }
    return {
      ...normalizedDescriptor,
      type: SOURCE_TYPES.ES_PEW_PEW,
      sourceGeoField: descriptor.sourceGeoField!,
      destGeoField: descriptor.destGeoField!,
    };
  }

  constructor(descriptor: ESPewPewSourceDescriptor) {
    super(descriptor);
    this._descriptor = descriptor;
  }

  renderSourceSettingsEditor({ onChange }: SourceEditorArgs) {
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

  getGeoGridPrecision(zoom: number) {
    const targetGeotileLevel = Math.ceil(zoom) + 2;
    return Math.min(targetGeotileLevel, MAX_GEOTILE_LEVEL);
  }

  async getGeoJsonWithMeta(
    layerName: string,
    searchFilters: VectorSourceRequestMeta,
    registerCancelCallback: (callback: () => void) => void,
    isRequestStillActive: () => boolean,
    inspectorAdapters: Adapters
  ): Promise<GeoJsonWithMeta> {
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
      ...(searchSource.getField('filter') as Filter[]),
      // destGeoField exists ensured by buffer filter
      // so only need additional check for sourceGeoField
      buildExistsFilter({ name: this._descriptor.sourceGeoField, type: 'geo_point' }, indexPattern),
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
      requestsAdapter: inspectorAdapters.requests,
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

  async getBoundsForFilters(
    boundsFilters: BoundsRequestMeta,
    registerCancelCallback: (callback: () => void) => void
  ): Promise<MapExtent | null> {
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
      const { rawResponse: esResp } = await lastValueFrom(
        searchSource.fetch$({
          abortSignal: abortController.signal,
          legacyHitsTotal: false,
          executionContext: makePublicExecutionContext('es_pew_pew_source:bounds'),
        })
      );
      const destBounds = (esResp.aggregations?.destFitToBounds as AggregationsGeoBoundsAggregate)
        .bounds as TopLeftBottomRightGeoBounds;
      if (destBounds) {
        corners.push([
          (destBounds.top_left as LatLonGeoLocation).lon,
          (destBounds.top_left as LatLonGeoLocation).lat,
        ]);
        corners.push([
          (destBounds.bottom_right as LatLonGeoLocation).lon,
          (destBounds.bottom_right as LatLonGeoLocation).lat,
        ]);
      }
      const sourceBounds = (
        esResp.aggregations?.sourceFitToBounds as AggregationsGeoBoundsAggregate
      ).bounds as TopLeftBottomRightGeoBounds;
      if (sourceBounds) {
        corners.push([
          (sourceBounds.top_left as LatLonGeoLocation).lon,
          (sourceBounds.top_left as LatLonGeoLocation).lat,
        ]);
        corners.push([
          (sourceBounds.bottom_right as LatLonGeoLocation).lon,
          (sourceBounds.bottom_right as LatLonGeoLocation).lat,
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
