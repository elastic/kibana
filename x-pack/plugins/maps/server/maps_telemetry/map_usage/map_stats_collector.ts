/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
import { LayerDescriptor } from '../../../common/descriptor_types';
import {
  GRID_RESOLUTION,
  LAYER_TYPE,
  RENDER_AS,
  SCALING_TYPES,
  SOURCE_TYPES,
} from '../../../common/constants';
import {
  EMSTMSSourceDescriptor,
  ESGeoGridSourceDescriptor,
  ESSearchSourceDescriptor,
  LayerDescriptor,
  VectorLayerDescriptor,
} from '../../../common/descriptor_types';
import {
  DEFAULT_EMS_DARKMAP_ID,
  DEFAULT_EMS_ROADMAP_DESATURATED_ID,
  DEFAULT_EMS_ROADMAP_ID,
} from '../../../../../../src/plugins/maps_ems/common/';
import { ClusterCountStats, EMS_BASEMAP_KEYS, JOIN_KEYS, LAYER_KEYS, MapStats, RESOLUTION_KEYS, SCALING_KEYS } from './types';


/*
 * Use MapStatsCollector instance to track map saved object stats.
 */
export class MapStatsCollector {
  private _mapCount = 0;
  private _layerCountsPerMap: number[] = [];
  private _sourceCountsPerMap: number[] = [];

  private _basemapClusterStats: { [key in EMS_BASEMAP_KEYS]?: ClusterCountStats; } = {};
  private _joinClusterStats: { [key in JOIN_KEYS]?: ClusterCountStats; } = {};
  private _layerClusterStats: { [key in LAYER_KEYS]?: ClusterCountStats; } = {};
  private _resolutionClusterStats: { [key in RESOLUTION_KEYS]?: ClusterCountStats; } = {};
  private _scalingClusterStats: { [key in SCALING_KEYS]?: ClusterCountStats; } = {};


  add(layerList: LayerDescriptor[]) {
    this._mapCount++;
    this._layerCountsPerMap.push(layerList.length);
    const sourceIdList = layerList
      .map((layer: LayerDescriptor) => {
        return 'id' in layer.sourceDescriptor ? layer.sourceDescriptor.id | null;
      })
      .filter((id: string | null) => {
        return id !== null;
      });
    this._sourceCountsPerMap.push(_.uniq(sourceIdList).length);

    const basemapCounts: { [key in EMS_BASEMAP_KEYS]?: number } = {};
    const joinCounts: { [key in JOIN_KEYS]?: number } = {};
    const layerCounts: { [key in LAYER_KEYS]?: number } = {};
    const resolutionCounts: { [key in RESOLUTION_KEYS]?: number } = {};
    const scalingCounts: { [key in SCALING_KEYS]?: number } = {};
    layerList.forEach(layerDescriptor => {
      this._updateCounts(getBasemapKey(layerDescriptor), basemapCounts);
      this._updateCounts(getJoinKey(layerDescriptor), joinCounts);
      this._updateCounts(getLayerKey(layerDescriptor), layerCounts);
      this._updateCounts(getResolutionKey(layerDescriptor), resolutionCounts);
      this._updateCounts(getScalingKey(layerDescriptor), scalingCounts);
    });
    this._updateClusterStats<EMS_BASEMAP_KEYS>(this._basemapClusterStats, basemapCounts);
    this._updateClusterStats<JOIN_KEYS>(this._joinClusterStats, joinCounts);
    this._updateClusterStats<LAYER_KEYS>(this._layerClusterStats, layerCounts);
    this._updateClusterStats<RESOLUTION_KEYS>(this._resolutionClusterStats, resolutionCounts);
    this._updateClusterStats<SCALING_KEYS>(this._scalingClusterStats, scalingCounts);
  }

  getStats(): MapStats {
    const layerCountSum = _.sum(this._layerCountsPerMap);
    const sourceCountSum = _.sum(this._sourceCountsPerMap);
    return {
      timeCaptured: new Date().toISOString(),
      mapsTotalCount: this._mapCount,
      basemaps: this._basemapClusterStats,
      joins: this._joinClusterStats,
      layerTypes: this._layerClusterStats,
      resolutions: this._resolutionClusterStats,
      scalingOptions: this._scalingClusterStats,
      attributesPerMap: {
        // Count of data sources per map
        dataSourcesCount: {
          min: this._sourceCountsPerMap.length ? _.min(this._sourceCountsPerMap) : 0,
          max: this._sourceCountsPerMap.length ? _.max(this._sourceCountsPerMap) : 0,
          avg: this._mapCount > 0 ? sourceCountSum / this._mapCount : 0,
        },
        // Total count of layers per map
        layersCount: {
          min: this._layerCountsPerMap.length ? _.min(this._layerCountsPerMap) : 0,
          max: this._layerCountsPerMap.length ? _.max(this._layerCountsPerMap) : 0,
          avg: this._mapCount > 0 ? layerCountSum / this._mapCount : 0,
        },
      }
    };
  }

  _updateClusterStats<Keys>(clusterStats: { [key in <Keys>]: ClusterCountStats; }, counts: { [key in <Keys>]: number; }) {
    for (const key in counts) {
      if (!counts.hasOwnProperty(key)) {
        continue;
      }

      if (!clusterStats[key]) {
        clusterCounts[key] = {
          min: counts[key],
          max: counts[key],
          total: counts[key],
          avg: 0,
        };
      } else {
        clusterStats[key].min = Math.min(counts[key], clusterStats[key].min);
        clusterStats[key].max = Math.max(counts[key], clusterStats[key].max);
        clusterStats[key].total += counts[key];
      }
      clusterStats[key].avg = clusterStats[key].total / this._mapCount;
    }
  }

  _updateCounts<Keys>(key: <Keys> | null, counts: { [key in <Keys>]: number; }) {
    if (key) {
      if (key in counts) {
        counts[key] += 1;
      } else {
        counts[key] = 1;
      }
    }
  }
}

function getBasemapKey(layerDescriptor: LayerDescriptor): EMS_BASEMAP_KEYS | null {
  if (
    !layerDescriptor.sourceDescriptor &&
    layerDescriptor.sourceDescriptor.type !== SOURCE_TYPES.EMS_TMS
  ) {
    return null;
  }

  const descriptor = layerDescriptor.sourceDescriptor as EMSTMSSourceDescriptor;

  if (descriptor.isAutoSelect) {
    return EMS_BASEMAP_KEYS.AUTO;
  }

  if (descriptor.id === DEFAULT_EMS_ROADMAP_ID) {
    return EMS_BASEMAP_KEYS.ROADMAP;
  }

  if (descriptor.id === DEFAULT_EMS_ROADMAP_DESATURATED_ID) {
    return EMS_BASEMAP_KEYS.ROADMAP_DESATURATED;
  }

  if (descriptor.id === DEFAULT_EMS_DARKMAP_ID) {
    return EMS_BASEMAP_KEYS.DARK;
  }

  return null;
}

function getJoinKey(layerDescriptor: LayerDescriptor): JOIN_KEYS | null {
  return layerDescriptor.type === LAYER_TYPE.GEOJSON_VECTOR &&
    (layerDescriptor as VectorLayerDescriptor)?.joins?.length
    ? JOIN_KEYS.TERM
    : null;
}

function getLayerKey(
  layerDescriptor: LayerDescriptor
): LAYER_KEYS | null {
  if (!layerDescriptor.sourceDescriptor) {
    return null;
  }

  if (layerDescriptor.type === LAYER_TYPE.HEATMAP) {
    return LAYER_KEYS.ES_AGG_HEATMAP;
  }

  if (layerDescriptor.sourceDescriptor.type === SOURCE_TYPES.EMS_FILE) {
    return LAYER_KEYS.EMS_REGION;
  }

  if (layerDescriptor.sourceDescriptor.type === SOURCE_TYPES.EMS_TMS) {
    return LAYER_KEYS.EMS_BASEMAP;
  }

  if (layerDescriptor.sourceDescriptor.type === SOURCE_TYPES.KIBANA_TILEMAP) {
    return LAYER_KEYS.KBN_TMS_RASTER;
  }

  if (layerDescriptor.sourceDescriptor.type === SOURCE_TYPES.EMS_XYZ) {
    return LAYER_KEYS.UX_TMS_RASTER;
  }

  if (layerDescriptor.sourceDescriptor.type === SOURCE_TYPES.WMS) {
    return LAYER_KEYS.UX_WMS;
  }

  if (layerDescriptor.sourceDescriptor.type === SOURCE_TYPES.MVT_SINGLE_LAYER) {
    return LAYER_KEYS.UX_TMS_MVT;
  }

  if (layerDescriptor.sourceDescriptor.type === SOURCE_TYPES.ES_GEO_LINE) {
    return LAYER_KEYS.ES_TRACKS;
  }

  if (layerDescriptor.sourceDescriptor.type === SOURCE_TYPES.ES_PEW_PEW) {
    return LAYER_KEYS.ES_POINT_TO_POINT;
  }

  if (layerDescriptor.sourceDescriptor.type === SOURCE_TYPES.ES_SEARCH) {
    const sourceDescriptor = layerDescriptor.sourceDescriptor as ESSearchSourceDescriptor;

    if (sourceDescriptor.scalingType === SCALING_TYPES.TOP_HITS) {
      return LAYER_KEYS.ES_TOP_HITS;
    } else {
      return LAYER_KEYS.ES_DOCS;
    }
  }

  if (layerDescriptor.sourceDescriptor.type === SOURCE_TYPES.ES_GEO_GRID) {
    const sourceDescriptor = layerDescriptor.sourceDescriptor as ESGeoGridSourceDescriptor;
    if (sourceDescriptor.requestType === RENDER_AS.POINT) {
      return LAYER_KEYS.ES_AGG_CLUSTERS;
    } else if (sourceDescriptor.requestType === RENDER_AS.GRID) {
      return LAYER_KEYS.ES_AGG_GRIDS;
    }
  }

  return null;
}

function getResolutionKey(layerDescriptor: LayerDescriptor): RESOLUTION_KEYS | null {
  if (
    !layerDescriptor.sourceDescriptor ||
    layerDescriptor.sourceDescriptor.type !== SOURCE_TYPES.ES_GEO_GRID ||
    !(layerDescriptor.sourceDescriptor as ESGeoGridSourceDescriptor).resolution
  ) {
    return null;
  }

  const descriptor = layerDescriptor.sourceDescriptor as ESGeoGridSourceDescriptor;

  if (descriptor.resolution === GRID_RESOLUTION.COARSE) {
    return RESOLUTION_KEYS.COARSE;
  }

  if (descriptor.resolution === GRID_RESOLUTION.FINE) {
    return RESOLUTION_KEYS.FINE;
  }

  if (descriptor.resolution === GRID_RESOLUTION.MOST_FINE) {
    return RESOLUTION_KEYS.MOST_FINE;
  }

  if (descriptor.resolution === GRID_RESOLUTION.SUPER_FINE) {
    return RESOLUTION_KEYS.SUPER_FINE;
  }

  return null;
}

function getScalingKey(layerDescriptor: LayerDescriptor): SCALING_KEYS | null {
  if (
    !layerDescriptor.sourceDescriptor ||
    layerDescriptor.sourceDescriptor.type !== SOURCE_TYPES.ES_SEARCH ||
    !(layerDescriptor.sourceDescriptor as ESSearchSourceDescriptor).scalingType
  ) {
    return null;
  }

  const descriptor = layerDescriptor.sourceDescriptor as ESSearchSourceDescriptor;

  if (descriptor.scalingType === SCALING_TYPES.CLUSTERS) {
    return SCALING_KEYS.CLUSTERS;
  }

  if (descriptor.scalingType === SCALING_TYPES.MVT) {
    return SCALING_KEYS.MVT;
  }

  if (descriptor.scalingType === SCALING_TYPES.LIMIT) {
    return SCALING_KEYS.LIMIT;
  }

  return null;
}