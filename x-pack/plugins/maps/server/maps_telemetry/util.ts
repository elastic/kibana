/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EMSTMSSourceDescriptor,
  ESGeoGridSourceDescriptor,
  ESSearchSourceDescriptor,
  LayerDescriptor,
  VectorLayerDescriptor,
} from '../../common/descriptor_types';
import {
  GRID_RESOLUTION,
  LAYER_TYPE,
  RENDER_AS,
  SCALING_TYPES,
  SOURCE_TYPES,
} from '../../common/constants';
import {
  DEFAULT_EMS_DARKMAP_ID,
  DEFAULT_EMS_ROADMAP_DESATURATED_ID,
  DEFAULT_EMS_ROADMAP_ID,
} from '../../../../../src/plugins/maps_ems/common/';

// lowercase is on purpose, so it matches lowercase es-field-names of the maps-telemetry schema
export enum TELEMETRY_LAYER_TYPE {
  ES_DOCS = 'es_docs',
  ES_TOP_HITS = 'es_top_hits',
  ES_TRACKS = 'es_tracks',
  ES_POINT_TO_POINT = 'es_point_to_point',
  ES_AGG_CLUSTERS = 'es_agg_clusters',
  ES_AGG_GRIDS = 'es_agg_grids',
  ES_AGG_HEATMAP = 'es_agg_heatmap',
  EMS_REGION = 'ems_region',
  EMS_BASEMAP = 'ems_basemap',
  KBN_TMS_RASTER = 'kbn_tms_raster',
  UX_TMS_RASTER = 'ux_tms_raster', // configured in the UX layer wizard of Maps
  UX_TMS_MVT = 'ux_tms_mvt', // configured in the UX layer wizard of Maps
  UX_WMS = 'ux_wms', // configured in the UX layer wizard of Maps
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
  ROADMAP_DESATURATED = 'roadmap_desaturated',
  ROADMAP = 'roadmap',
  AUTO = 'auto',
  DARK = 'dark',
}

export type TELEMETRY_BASEMAP_COUNTS_PER_CLUSTER = {
  [key in TELEMETRY_EMS_BASEMAP_TYPES]?: ClusterCountStats;
};

export enum TELEMETRY_SCALING_OPTIONS {
  LIMIT = 'limit',
  MVT = 'mvt',
  CLUSTERS = 'clusters',
}

export type TELEMETRY_SCALING_OPTION_COUNTS_PER_CLUSTER = {
  [key in TELEMETRY_SCALING_OPTIONS]?: ClusterCountStats;
};

const TELEMETRY_TERM_JOIN = 'term';
export interface TELEMETRY_TERM_JOIN_COUNTS_PER_CLUSTER {
  [TELEMETRY_TERM_JOIN]?: ClusterCountStats;
}

export enum TELEMETRY_GRID_RESOLUTION {
  COARSE = 'coarse',
  FINE = 'fine',
  MOST_FINE = 'most_fine',
  SUPER_FINE = 'super_fine',
}
export type TELEMETRY_GRID_RESOLUTION_COUNTS_PER_CLUSTER = {
  [key in TELEMETRY_GRID_RESOLUTION]?: ClusterCountStats;
};

// These capture a particular "combo" of source and layer-settings.
// They are mutually exclusive (ie. a layerDescriptor can only be a single telemetry_layer_type)
// They are more useful from a telemetry-perspective than:
// - an actual SourceType (which does not say enough about how it looks on a map)
// - an actual LayerType (which is too coarse and does not say much about what kind of data)
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

function getScalingOption(layerDescriptor: LayerDescriptor): TELEMETRY_SCALING_OPTIONS | null {
  if (
    !layerDescriptor.sourceDescriptor ||
    layerDescriptor.sourceDescriptor.type !== SOURCE_TYPES.ES_SEARCH ||
    !(layerDescriptor.sourceDescriptor as ESSearchSourceDescriptor).scalingType
  ) {
    return null;
  }

  const descriptor = layerDescriptor.sourceDescriptor as ESSearchSourceDescriptor;

  if (descriptor.scalingType === SCALING_TYPES.CLUSTERS) {
    return TELEMETRY_SCALING_OPTIONS.CLUSTERS;
  }

  if (descriptor.scalingType === SCALING_TYPES.MVT) {
    return TELEMETRY_SCALING_OPTIONS.MVT;
  }

  if (descriptor.scalingType === SCALING_TYPES.LIMIT) {
    return TELEMETRY_SCALING_OPTIONS.LIMIT;
  }

  return null;
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
      (layerDescriptor as VectorLayerDescriptor)?.joins?.length
      ? TELEMETRY_TERM_JOIN
      : null;
  });
}

function getGridResolution(layerDescriptor: LayerDescriptor): TELEMETRY_GRID_RESOLUTION | null {
  if (
    !layerDescriptor.sourceDescriptor ||
    layerDescriptor.sourceDescriptor.type !== SOURCE_TYPES.ES_GEO_GRID ||
    !(layerDescriptor.sourceDescriptor as ESGeoGridSourceDescriptor).resolution
  ) {
    return null;
  }

  const descriptor = layerDescriptor.sourceDescriptor as ESGeoGridSourceDescriptor;

  if (descriptor.resolution === GRID_RESOLUTION.COARSE) {
    return TELEMETRY_GRID_RESOLUTION.COARSE;
  }

  if (descriptor.resolution === GRID_RESOLUTION.FINE) {
    return TELEMETRY_GRID_RESOLUTION.FINE;
  }

  if (descriptor.resolution === GRID_RESOLUTION.MOST_FINE) {
    return TELEMETRY_GRID_RESOLUTION.MOST_FINE;
  }

  if (descriptor.resolution === GRID_RESOLUTION.SUPER_FINE) {
    return TELEMETRY_GRID_RESOLUTION.SUPER_FINE;
  }

  return null;
}

export function getGridResolutionsPerCluster(
  layerLists: LayerDescriptor[][]
): TELEMETRY_GRID_RESOLUTION_COUNTS_PER_CLUSTER {
  return getCountsByCluster(layerLists, getGridResolution);
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
