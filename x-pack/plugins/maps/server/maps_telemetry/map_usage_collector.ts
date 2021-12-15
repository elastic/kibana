/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LayerDescriptor } from '../../common/descriptor_types';
import {
  GRID_RESOLUTION,
  LAYER_TYPE,
  RENDER_AS,
  SCALING_TYPES,
  SOURCE_TYPES,
} from '../../common/constants';
import {
  EMSTMSSourceDescriptor,
  ESGeoGridSourceDescriptor,
  ESSearchSourceDescriptor,
  LayerDescriptor,
  VectorLayerDescriptor,
} from '../../common/descriptor_types';
import {
  DEFAULT_EMS_DARKMAP_ID,
  DEFAULT_EMS_ROADMAP_DESATURATED_ID,
  DEFAULT_EMS_ROADMAP_ID,
} from '../../../../../src/plugins/maps_ems/common/';

interface ClusterCountStats {
  min: number;
  max: number;
  total: number;
  avg: number;
}

export interface MapUsage {
  mapsTotalCount: number;
  timeCaptured: string;
  layerTypes: TELEMETRY_LAYER_TYPE_COUNTS_PER_CLUSTER;
  scalingOptions: TELEMETRY_SCALING_OPTION_COUNTS_PER_CLUSTER;
  joins: TELEMETRY_TERM_JOIN_COUNTS_PER_CLUSTER;
  basemaps: { [key: string]: ClusterCountStats; };
  resolutions: { [key: string]: ClusterCountStats; };
  attributesPerMap: {
    dataSourcesCount: {
      min: number;
      max: number;
      avg: number;
    };
    layersCount: {
      min: number;
      max: number;
      avg: number;
    };
    layerTypesCount: IStats;
    emsVectorLayersCount: IStats;
  };
}

/*
 * Use MapUsage instance to track map saved object usage stats.
 */
export class MapUsageCollector {
  private _mapCount = 0;
  private _basemapClusterStats: { [key: string]: ClusterCountStats; } = {};
  private _resolutionClusterStats: { [key: string]: ClusterCountStats; } = {};

  increment(layerList: LayerDescriptor[]) {
    this._mapCount++;
    const basemapCounts = { [key: string]: number } = {};
    const resolutionCounts = { [key: string]: number } = {};

    layerList.forEach(layerDescriptor => {
      // track EMS basemap counts
      if (
        layerDescriptor.sourceDescriptor &&
        layerDescriptor.sourceDescriptor.type === SOURCE_TYPES.EMS_TMS
      ) {
        const basemapType = getBasemapType(layerDescriptor.sourceDescriptor as EMSTMSSourceDescriptor);
        if (basemapType in basemapCounts) {
          basemapCounts[basemapType] += 1;
        } else {
          basemapCounts[basemapType] = 1;
        }
      }

      // track resolution counts
      if (
        layerDescriptor.sourceDescriptor &&
        layerDescriptor.sourceDescriptor.type === SOURCE_TYPES.ES_GEO_GRID) {
        const resolution = (layerDescriptor.sourceDescriptor as ESGeoGridSourceDescriptor).resolution;
        if (resolution in resolutionCounts) {
          resolutionCounts[resolution] += 1;
        } else {
          resolutionCounts[resolution] = 1;
        }
      }
    });

    this._updateClusterStats(this._basemapClusterStats, basemapCounts);
    this._updateClusterStats(this._resolutionClusterStats, resolutionCounts);
  }

  getUsage(): MapUsage {
    _setClusterStatsAvg(this._basemapClusterStats);
    _setClusterStatsAvg(this._resolutionClusterStats);

    return {
      timeCaptured: new Date().toISOString(),
      mapsTotalCount: this._mapCount;
      basemaps: this._basemapClusterStats;
      resolutions: this._resolutionClusterStats;
    };
  }

  _updateClusterStats(clusterStats: { [key: string]: ClusterCountStats; }, counts: { [key: string]: number; }) {+
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
    }
  }

  _setClusterStatsAvg(clusterStats: { [key: string]: ClusterCountStats; }) {
    for (const key in clusterStats) {
      if (clusterStats.hasOwnProperty(key)) {
        clusterStats[key].avg = clusterStats[key].total / this._mapCount;
      }
    }
  }
}

function getBasemapType(descriptor: EMSTMSSourceDescriptor): string {
  return descriptor.isAutoSelect ? 'auto' : descriptor.id;
}

/*

  const dataSourcesCount = layerLists.map((layerList: LayerDescriptor[]) => {
    // todo: not every source-descriptor has an id
    // @ts-ignore
    const sourceIdList = layerList.map((layer: LayerDescriptor) => layer.sourceDescriptor.id);
    return _.uniq(sourceIdList).length;
  });

  const layersCount = layerLists.map((lList) => lList.length);
  const layerTypesCount = layerLists.map((lList) => _.countBy(lList, 'type'));

  // Count of EMS Vector layers used
  const emsLayersCount = getEMSLayerCount(layerLists);

  const dataSourcesCountSum = _.sum(dataSourcesCount);
  const layersCountSum = _.sum(layersCount);

  const telemetryLayerTypeCounts = getTelemetryLayerTypesPerCluster(layerLists);
  const scalingOptions = getScalingOptionsPerCluster(layerLists);
  const joins = getTermJoinsPerCluster(layerLists);*/