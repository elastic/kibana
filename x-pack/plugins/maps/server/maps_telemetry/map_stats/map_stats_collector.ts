/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
import {
  GRID_RESOLUTION,
  LAYER_TYPE,
  RENDER_AS,
  SCALING_TYPES,
  SOURCE_TYPES,
} from '../../../common/constants';
import {
  EMSTMSSourceDescriptor,
  EMSFileSourceDescriptor,
  ESGeoGridSourceDescriptor,
  ESSearchSourceDescriptor,
  LayerDescriptor,
  VectorLayerDescriptor,
} from '../../../common/descriptor_types';
import { MapSavedObjectAttributes } from '../../../common/map_saved_object_type';
import {
  DEFAULT_EMS_DARKMAP_ID,
  DEFAULT_EMS_ROADMAP_DESATURATED_ID,
  DEFAULT_EMS_ROADMAP_ID,
} from '../../../../../../src/plugins/maps_ems/common/';
import {
  ClusterCountStats,
  EMS_BASEMAP_KEYS,
  JOIN_KEYS,
  LAYER_KEYS,
  MapStats,
  RESOLUTION_KEYS,
  SCALING_KEYS,
} from './types';
import { MapSettings } from '../../../public/reducers/map';

/*
 * Use MapStatsCollector instance to track map saved object stats.
 */
export class MapStatsCollector {
  private _mapCount = 0;

  // cluster stats
  private _basemapClusterStats: { [key in EMS_BASEMAP_KEYS]?: ClusterCountStats } = {};
  private _joinClusterStats: { [key in JOIN_KEYS]?: ClusterCountStats } = {};
  private _layerClusterStats: { [key in LAYER_KEYS]?: ClusterCountStats } = {};
  private _resolutionClusterStats: { [key in RESOLUTION_KEYS]?: ClusterCountStats } = {};
  private _scalingClusterStats: { [key in SCALING_KEYS]?: ClusterCountStats } = {};

  // attributesPerMap
  private _emsFileClusterStats: { [key: string]: ClusterCountStats } = {};
  private _layerCountStats: ClusterCountStats | undefined;
  private _layerTypeClusterStats: { [key: string]: ClusterCountStats } = {};
  private _customIconsCountStats: ClusterCountStats | undefined;
  private _sourceCountStats: ClusterCountStats | undefined;

  push(attributes: MapSavedObjectAttributes) {
    if (!attributes || !attributes.mapStateJSON || !attributes.layerListJSON) {
      return;
    }

    let mapSettings: MapSettings;
    try {
      const mapState = JSON.parse(attributes.mapStateJSON);
      mapSettings = mapState.settings;
    } catch (e) {
      return;
    }

    let layerList: LayerDescriptor[] = [];
    try {
      layerList = JSON.parse(attributes.layerListJSON);
    } catch (e) {
      return;
    }

    this._mapCount++;

    if (mapSettings && mapSettings.customIcons) {
      const customIconsCount = mapSettings.customIcons.length;
      if (this._customIconsCountStats) {
        const customIconsCountTotal = this._customIconsCountStats.total + customIconsCount;
        this._customIconsCountStats = {
          min: Math.min(customIconsCount, this._customIconsCountStats.min),
          max: Math.max(customIconsCount, this._customIconsCountStats.max),
          total: customIconsCountTotal,
          avg: customIconsCountTotal / this._mapCount,
        };
      } else {
        this._customIconsCountStats = {
          min: customIconsCount,
          max: customIconsCount,
          total: customIconsCount,
          avg: customIconsCount,
        };
      }
    }

    const layerCount = layerList.length;
    if (this._layerCountStats) {
      const layerCountTotal = this._layerCountStats.total + layerCount;
      this._layerCountStats = {
        min: Math.min(layerCount, this._layerCountStats.min),
        max: Math.max(layerCount, this._layerCountStats.max),
        total: layerCountTotal,
        avg: layerCountTotal / this._mapCount,
      };
    } else {
      this._layerCountStats = {
        min: layerCount,
        max: layerCount,
        total: layerCount,
        avg: layerCount,
      };
    }

    const sourceIdList = layerList
      .map((layer: LayerDescriptor) => {
        return layer.sourceDescriptor && 'id' in layer.sourceDescriptor
          ? layer.sourceDescriptor.id
          : null;
      })
      .filter((id: string | null | undefined) => {
        return id;
      });
    const sourceCount = _.uniq(sourceIdList).length;
    if (this._sourceCountStats) {
      const sourceCountTotal = this._sourceCountStats.total + sourceCount;
      this._sourceCountStats = {
        min: Math.min(sourceCount, this._sourceCountStats.min),
        max: Math.max(sourceCount, this._sourceCountStats.max),
        total: sourceCountTotal,
        avg: sourceCountTotal / this._mapCount,
      };
    } else {
      this._sourceCountStats = {
        min: sourceCount,
        max: sourceCount,
        total: sourceCount,
        avg: sourceCount,
      };
    }

    const basemapCounts: { [key in EMS_BASEMAP_KEYS]?: number } = {};
    const joinCounts: { [key in JOIN_KEYS]?: number } = {};
    const layerCounts: { [key in LAYER_KEYS]?: number } = {};
    const resolutionCounts: { [key in RESOLUTION_KEYS]?: number } = {};
    const scalingCounts: { [key in SCALING_KEYS]?: number } = {};
    const emsFileCounts: { [key: string]: number } = {};
    const layerTypeCounts: { [key: string]: number } = {};
    layerList.forEach((layerDescriptor) => {
      this._updateCounts(getBasemapKey(layerDescriptor), basemapCounts);
      this._updateCounts(getJoinKey(layerDescriptor), joinCounts);
      this._updateCounts(getLayerKey(layerDescriptor), layerCounts);
      this._updateCounts(getResolutionKey(layerDescriptor), resolutionCounts);
      this._updateCounts(getScalingKey(layerDescriptor), scalingCounts);
      this._updateCounts(getEmsFileId(layerDescriptor), emsFileCounts);
      if (layerDescriptor.type) {
        this._updateCounts(layerDescriptor.type, layerTypeCounts);
      }
    });
    this._updateClusterStats(this._basemapClusterStats, basemapCounts);
    this._updateClusterStats(this._joinClusterStats, joinCounts);
    this._updateClusterStats(this._layerClusterStats, layerCounts);
    this._updateClusterStats(this._resolutionClusterStats, resolutionCounts);
    this._updateClusterStats(this._scalingClusterStats, scalingCounts);
    this._updateClusterStats(this._emsFileClusterStats, emsFileCounts);
    this._updateClusterStats(this._layerTypeClusterStats, layerTypeCounts);
  }

  getStats(): MapStats {
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
        dataSourcesCount: this._sourceCountStats
          ? this._excludeTotal(this._sourceCountStats)
          : { min: 0, max: 0, avg: 0 },
        // Total count of layers per map
        layersCount: this._layerCountStats
          ? this._excludeTotal(this._layerCountStats)
          : { min: 0, max: 0, avg: 0 },
        // Count of layers by type
        layerTypesCount: this._excludeTotalFromKeyedStats(this._layerTypeClusterStats),
        // Count of layer by EMS region
        emsVectorLayersCount: this._excludeTotalFromKeyedStats(this._emsFileClusterStats),
        // Count of custom icons per map
        customIconsCount: this._customIconsCountStats
          ? this._excludeTotal(this._customIconsCountStats)
          : { min: 0, max: 0, avg: 0 },
      },
    };
  }

  _updateClusterStats(
    clusterStats: { [key: string]: ClusterCountStats },
    counts: { [key: string]: number }
  ) {
    for (const key in counts) {
      if (!counts.hasOwnProperty(key)) {
        continue;
      }

      if (!clusterStats[key]) {
        clusterStats[key] = {
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
    }

    for (const key in clusterStats) {
      if (clusterStats.hasOwnProperty(key)) {
        clusterStats[key].avg = clusterStats[key].total / this._mapCount;
      }
    }
  }

  _updateCounts(key: string | null, counts: { [key: string]: number }) {
    if (key) {
      if (key in counts) {
        counts[key] += 1;
      } else {
        counts[key] = 1;
      }
    }
  }

  // stats in attributesPerMap do not include 'total' key. Use this method to remove 'total' key from ClusterCountStats
  _excludeTotalFromKeyedStats(clusterStats: { [key: string]: ClusterCountStats }): {
    [key: string]: Omit<ClusterCountStats, 'total'>;
  } {
    const results: { [key: string]: Omit<ClusterCountStats, 'total'> } = {};
    for (const key in clusterStats) {
      if (clusterStats.hasOwnProperty(key)) {
        results[key] = this._excludeTotal(clusterStats[key]);
      }
    }
    return results;
  }

  _excludeTotal(stats: ClusterCountStats): Omit<ClusterCountStats, 'total'> {
    const modifiedStats = { ...stats } as {
      min: number;
      max: number;
      total?: number;
      avg: number;
    };
    delete modifiedStats.total;
    return modifiedStats;
  }
}

function getEmsFileId(layerDescriptor: LayerDescriptor): string | null {
  return layerDescriptor.sourceDescriptor !== null &&
    layerDescriptor.sourceDescriptor.type === SOURCE_TYPES.EMS_FILE &&
    'id' in layerDescriptor.sourceDescriptor
    ? (layerDescriptor.sourceDescriptor as EMSFileSourceDescriptor).id
    : null;
}

function getBasemapKey(layerDescriptor: LayerDescriptor): EMS_BASEMAP_KEYS | null {
  if (
    !layerDescriptor.sourceDescriptor ||
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

function getLayerKey(layerDescriptor: LayerDescriptor): LAYER_KEYS | null {
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
    } else if (sourceDescriptor.requestType === RENDER_AS.HEX) {
      return LAYER_KEYS.ES_AGG_HEXAGONS;
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
