/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// These capture a particular "combo" of source and layer-settings.
// They are mutually exclusive (ie. a layerDescriptor can only be a single telemetry_layer_type)
// They are more useful from a telemetry-perspective than:
// - an actual SourceType (which does not say enough about how it looks on a map)
// - an actual LayerType (which is too coarse and does not say much about what kind of data)
import {
  EMSTMSSourceDescriptor,
  ESGeoGridSourceDescriptor,
  ESSearchSourceDescriptor,
  LayerDescriptor,
} from '../../common/descriptor_types';
import { LAYER_TYPE, RENDER_AS, SCALING_TYPES, SOURCE_TYPES } from '../../common';
import {
  DEFAULT_EMS_DARKMAP_ID,
  DEFAULT_EMS_ROADMAP_DESATURATED_ID,
  DEFAULT_EMS_ROADMAP_ID,
} from '../../../../../src/plugins/maps_ems/common/';

export enum TELEMETRY_LAYER_TYPE {
  ES_DOCS = 'ES_DOCS',
  ES_TOP_HITS = 'ES_TOP_HITS',
  ES_TRACKS = 'ES_TRACKS',
  ES_POINT_TO_POINT = 'ES_POINT_TO_POINT',
  ES_AGG_CLUSTERS = 'ES_AGG_CLUSTERS',
  ES_AGG_GRIDS = 'ES_AGG_GRIDS',
  ES_AGG_HEATMAP = 'ES_AGG_HEATMAP',
  EMS_REGION = 'EMS_REGION',
  EMS_BASEMAP = 'EMS_BASEMAP',
  KBN_REGION = 'KBN_REGION',
  KBN_TMS_RASTER = 'KBN_TMS_RASTER',
  UX_TMS_RASTER = 'TMS_RASTER',
  UX_TMS_MVT = 'UX_TMS_MVT',
  UX_WMS = 'UX_WMS',
}

interface ClusterCountStats {
  min: number;
  max: number;
  total: number;
  avg: number;
}

export type TELEMETRY_LAYER_TYPE_COUNTS_PER_CLUSTER = {
  [key in TELEMETRY_LAYER_TYPE]?: ClusterCountStats;
};

export enum TELEMETRY_EMS_BASEMAP_TYPES {
  ROADMAP_DESATURATED = 'DESATURATED',
  ROADMAP = 'ROADMAP',
  AUTO = 'AUTO',
  DARK = 'DARK',
}

export type TELEMETRY_BASEMAP_COUNTS_PER_CLUSTER = {
  [key in TELEMETRY_EMS_BASEMAP_TYPES]?: ClusterCountStats;
};

export function getTelemetryLayerType(
  layerDescriptor: LayerDescriptor
): TELEMETRY_LAYER_TYPE | null {
  if (!layerDescriptor.sourceDescriptor) {
    return null;
  }

  if (layerDescriptor.type === LAYER_TYPE.HEATMAP) {
    return TELEMETRY_LAYER_TYPE.ES_AGG_HEATMAP;
  }

  if (layerDescriptor.sourceDescriptor.type === SOURCE_TYPES.EMS_FILE) {
    return TELEMETRY_LAYER_TYPE.EMS_REGION;
  }

  if (layerDescriptor.sourceDescriptor.type === SOURCE_TYPES.EMS_TMS) {
    return TELEMETRY_LAYER_TYPE.EMS_BASEMAP;
  }

  if (layerDescriptor.sourceDescriptor.type === SOURCE_TYPES.KIBANA_TILEMAP) {
    return TELEMETRY_LAYER_TYPE.KBN_TMS_RASTER;
  }

  if (layerDescriptor.sourceDescriptor.type === SOURCE_TYPES.REGIONMAP_FILE) {
    return TELEMETRY_LAYER_TYPE.KBN_REGION;
  }

  if (layerDescriptor.sourceDescriptor.type === SOURCE_TYPES.EMS_XYZ) {
    return TELEMETRY_LAYER_TYPE.UX_TMS_RASTER;
  }

  if (layerDescriptor.sourceDescriptor.type === SOURCE_TYPES.WMS) {
    return TELEMETRY_LAYER_TYPE.UX_WMS;
  }

  if (layerDescriptor.sourceDescriptor.type === SOURCE_TYPES.MVT_SINGLE_LAYER) {
    return TELEMETRY_LAYER_TYPE.UX_TMS_MVT;
  }

  if (layerDescriptor.sourceDescriptor.type === SOURCE_TYPES.ES_GEO_LINE) {
    return TELEMETRY_LAYER_TYPE.ES_TRACKS;
  }

  if (layerDescriptor.sourceDescriptor.type === SOURCE_TYPES.ES_PEW_PEW) {
    return TELEMETRY_LAYER_TYPE.ES_POINT_TO_POINT;
  }

  if (layerDescriptor.sourceDescriptor.type === SOURCE_TYPES.ES_SEARCH) {
    const sourceDescriptor = layerDescriptor.sourceDescriptor as ESSearchSourceDescriptor;

    if (sourceDescriptor.scalingType === SCALING_TYPES.TOP_HITS) {
      return TELEMETRY_LAYER_TYPE.ES_TOP_HITS;
    } else {
      return TELEMETRY_LAYER_TYPE.ES_DOCS;
    }
  }

  if (layerDescriptor.sourceDescriptor.type === SOURCE_TYPES.ES_GEO_GRID) {
    const sourceDescriptor = layerDescriptor.sourceDescriptor as ESGeoGridSourceDescriptor;
    if (sourceDescriptor.requestType === RENDER_AS.POINT) {
      return TELEMETRY_LAYER_TYPE.ES_AGG_CLUSTERS;
    } else if (sourceDescriptor.requestType === RENDER_AS.GRID) {
      return TELEMETRY_LAYER_TYPE.ES_AGG_GRIDS;
    }
  }

  return null;
}

export interface TELEMETRY_SCALING_OPTION_COUNTS_PER_CLUSTER {
  [SCALING_TYPES.LIMIT]?: ClusterCountStats;
  [SCALING_TYPES.MVT]?: ClusterCountStats;
  [SCALING_TYPES.CLUSTERS]?: ClusterCountStats;
}

export interface TELEMETRY_TERM_JOIN_COUNTS_PER_CLUSTER {
  TERM?: ClusterCountStats;
}

function getScalingOption(layerDescriptor: LayerDescriptor): SCALING_TYPES | null {
  if (
    !layerDescriptor.sourceDescriptor ||
    layerDescriptor.sourceDescriptor.type !== SOURCE_TYPES.ES_SEARCH ||
    !(layerDescriptor.sourceDescriptor as ESSearchSourceDescriptor).scalingType
  ) {
    return null;
  }
  return (layerDescriptor.sourceDescriptor as ESSearchSourceDescriptor).scalingType;
}

export function getCountsByMap<K extends string>(
  layerDescriptors: LayerDescriptor[],
  mapToKey: (layerDescriptor: LayerDescriptor) => string | null
): { [key: string]: number } {
  const counts: { [key: string]: number } = {};
  layerDescriptors.forEach((layerDescriptor: LayerDescriptor) => {
    const scalingOption = mapToKey(layerDescriptor);
    if (!scalingOption) {
      return;
    }

    if (!counts[scalingOption]) {
      counts[scalingOption] = 1;
    } else {
      (counts[scalingOption] as number) += 1;
    }
  });
  return counts;
}

export function getCountsByCluster(
  layerLists: LayerDescriptor[][],
  mapToKey: (layerDescriptor: LayerDescriptor) => string | null
): { [key: string]: ClusterCountStats } {
  const counts = layerLists.map((layerDescriptors: LayerDescriptor[]) => {
    return getCountsByMap(layerDescriptors, mapToKey);
  });
  const clusterCounts: { [key: string]: ClusterCountStats } = {};

  counts.forEach((count) => {
    for (const key in count) {
      if (!count.hasOwnProperty(key)) {
        continue;
      }

      if (!clusterCounts[key]) {
        clusterCounts[key] = {
          min: count[key] as number,
          max: count[key] as number,
          total: count[key] as number,
          avg: count[key] as number,
        };
      } else {
        (clusterCounts[key] as ClusterCountStats).min = Math.min(
          count[key] as number,
          (clusterCounts[key] as ClusterCountStats).min
        );
        (clusterCounts[key] as ClusterCountStats).max = Math.max(
          count[key] as number,
          (clusterCounts[key] as ClusterCountStats).max
        );
        (clusterCounts[key] as ClusterCountStats).total =
          (count[key] as number) + (clusterCounts[key] as ClusterCountStats).total;
      }
    }
  });

  for (const key in clusterCounts) {
    if (clusterCounts.hasOwnProperty(key)) {
      clusterCounts[key].avg = clusterCounts[key].total / layerLists.length;
    }
  }

  return clusterCounts;
}

export function getScalingOptionsPerCluster(layerLists: LayerDescriptor[][]) {
  return getCountsByCluster(layerLists, getScalingOption);
}

export function getTelemetryLayerTypesPerCluster(
  layerLists: LayerDescriptor[][]
): TELEMETRY_LAYER_TYPE_COUNTS_PER_CLUSTER {
  return getCountsByCluster(layerLists, getTelemetryLayerType);
}

export function getTermJoinsPerCluster(
  layerLists: LayerDescriptor[][]
): TELEMETRY_TERM_JOIN_COUNTS_PER_CLUSTER {
  return getCountsByCluster(layerLists, (layerDescriptor: LayerDescriptor) => {
    return layerDescriptor.type === LAYER_TYPE.VECTOR &&
      layerDescriptor.joins &&
      layerDescriptor.joins.length
      ? 'TERM'
      : null;
  });
}

export function getBaseMapsPerCluster(
  layerLists: LayerDescriptor[][]
): TELEMETRY_BASEMAP_COUNTS_PER_CLUSTER {
  return getCountsByCluster(layerLists, (layerDescriptor: LayerDescriptor) => {
    if (
      !layerDescriptor.sourceDescriptor ||
      layerDescriptor.sourceDescriptor.type !== SOURCE_TYPES.EMS_TMS
    ) {
      return null;
    }

    const descriptor = layerDescriptor.sourceDescriptor as EMSTMSSourceDescriptor;

    if (descriptor.isAutoSelect) {
      return TELEMETRY_EMS_BASEMAP_TYPES.AUTO;
    }

    // This needs to be hardcoded.
    if (descriptor.id === DEFAULT_EMS_ROADMAP_ID) {
      return TELEMETRY_EMS_BASEMAP_TYPES.ROADMAP;
    }

    if (descriptor.id === DEFAULT_EMS_ROADMAP_DESATURATED_ID) {
      return TELEMETRY_EMS_BASEMAP_TYPES.ROADMAP_DESATURATED;
    }

    if (descriptor.id === DEFAULT_EMS_DARKMAP_ID) {
      return TELEMETRY_EMS_BASEMAP_TYPES.DARK;
    }

    return TELEMETRY_EMS_BASEMAP_TYPES.ROADMAP;
  });
}
