/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { asyncForEach } from '@kbn/std';
import { KBN_FIELD_TYPES } from '@kbn/field-types';
import { DataViewsService } from '../../../../../../src/plugins/data_views/common';
import { LAYER_TYPE, SCALING_TYPES, SOURCE_TYPES } from '../../../common/constants';
import { injectReferences } from '../../../common/migrations/references';
import {
  ESGeoGridSourceDescriptor,
  ESSearchSourceDescriptor,
  LayerDescriptor,
} from '../../../common/descriptor_types';
import { MapSavedObject } from '../../../common/map_saved_object_type';
import { IndexPatternStats } from './types';

/*
 * Use IndexPatternStatsCollector instance to track index pattern geospatial field stats.
 */
export class IndexPatternStatsCollector {
  private _geoShapeAggCount = 0;
  private _indexPatternsService: DataViewsService;

  constructor(indexPatternService: DataViewsService) {
    this._indexPatternsService = indexPatternService;
  }

  async push(savedObject: MapSavedObject) {
    let layerList: LayerDescriptor[] = [];
    try {
      const { attributes } = injectReferences(savedObject);
      if (!attributes.layerListJSON) {
        return;
      }
      layerList = JSON.parse(attributes.layerListJSON);
    } catch (e) {
      return;
    }

    let geoShapeAggCountPerMap = 0;
    await asyncForEach(layerList, async (layerDescriptor) => {
      if (await this._isGeoShapeAggLayer(layerDescriptor)) {
        geoShapeAggCountPerMap++;
      }
    });
    this._geoShapeAggCount += geoShapeAggCountPerMap;
  }

  async getStats(): Promise<IndexPatternStats> {
    let geoCount = 0;
    let pointCount = 0;
    let shapeCount = 0;

    const indexPatternIds = await this._indexPatternsService.getIds();
    await asyncForEach(indexPatternIds, async (indexPatternId) => {
      let indexPattern;
      try {
        indexPattern = await this._indexPatternsService.get(indexPatternId);
      } catch (e) {
        return;
      }
      const pointFields = indexPattern.fields.getByType(KBN_FIELD_TYPES.GEO_POINT);
      const shapeFields = indexPattern.fields.getByType(KBN_FIELD_TYPES.GEO_SHAPE);
      if (pointFields.length || shapeFields.length) {
        geoCount++;
      }
      if (pointFields.length) {
        pointCount++;
      }
      if (shapeFields.length) {
        shapeCount++;
      }
    });

    return {
      // Tracks whether user uses Gold+ functionality of aggregating on geo_shape field
      geoShapeAggLayersCount: this._geoShapeAggCount,
      indexPatternsWithGeoFieldCount: geoCount,
      indexPatternsWithGeoPointFieldCount: pointCount,
      indexPatternsWithGeoShapeFieldCount: shapeCount,
    };
  }

  async _isFieldGeoShape(indexPatternId: string, geoField: string | undefined): Promise<boolean> {
    if (!geoField || !indexPatternId) {
      return false;
    }

    let indexPattern;
    try {
      indexPattern = await this._indexPatternsService.get(indexPatternId);
    } catch (e) {
      return false;
    }

    const field = indexPattern.getFieldByName(geoField);
    return !!field && field.type === KBN_FIELD_TYPES.GEO_SHAPE;
  }

  async _isGeoShapeAggLayer(layer: LayerDescriptor): Promise<boolean> {
    if (!layer.sourceDescriptor) {
      return false;
    }

    if (
      layer.type !== LAYER_TYPE.GEOJSON_VECTOR &&
      layer.type !== LAYER_TYPE.BLENDED_VECTOR &&
      layer.type !== LAYER_TYPE.HEATMAP
    ) {
      return false;
    }

    const sourceDescriptor = layer.sourceDescriptor;
    if (sourceDescriptor.type === SOURCE_TYPES.ES_GEO_GRID) {
      return await this._isFieldGeoShape(
        (sourceDescriptor as ESGeoGridSourceDescriptor).indexPatternId,
        (sourceDescriptor as ESGeoGridSourceDescriptor).geoField
      );
    }

    if (
      sourceDescriptor.type === SOURCE_TYPES.ES_SEARCH &&
      (sourceDescriptor as ESSearchSourceDescriptor).scalingType === SCALING_TYPES.CLUSTERS
    ) {
      return await this._isFieldGeoShape(
        (sourceDescriptor as ESSearchSourceDescriptor).indexPatternId,
        (sourceDescriptor as ESSearchSourceDescriptor).geoField
      );
    }

    return false;
  }
}
