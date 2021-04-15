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
  ESGeoGridSourceDescriptor,
  ESSearchSourceDescriptor,
  LayerDescriptor,
} from '../../common/descriptor_types';
import { LAYER_TYPE, RENDER_AS, SCALING_TYPES, SOURCE_TYPES } from '../../common';

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

export type TELEMETRY_LAYER_TYPE_COUNTS_PER_MAP = {
  [key in TELEMETRY_LAYER_TYPE]?: number;
};

interface ClusterCounts {
  min: number;
  max: number;
  total: number;
  avg: number;
}

export type TELEMETRY_LAYER_TYPE_COUNTS_PER_CLUSTER = {
  [key in TELEMETRY_LAYER_TYPE]?: ClusterCounts;
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

export function getTelemetyLayerTypesPerMap(
  layerDescriptors: LayerDescriptor[]
): TELEMETRY_LAYER_TYPE_COUNTS_PER_MAP {
  const counts: TELEMETRY_LAYER_TYPE_COUNTS_PER_MAP = {};

  layerDescriptors.forEach((layerDescriptor: LayerDescriptor) => {
    const telemetryLayerType: TELEMETRY_LAYER_TYPE | null = getTelemetryLayerType(layerDescriptor);

    if (!telemetryLayerType) {
      return;
    }

    if (!counts[telemetryLayerType]) {
      counts[telemetryLayerType] = 1;
    } else {
      (counts[telemetryLayerType] as number) += 1;
    }
  });

  return counts;
}

export function getTelemetryLayerTypesPerCluster(
  layerLists: LayerDescriptor[][]
): TELEMETRY_LAYER_TYPE_COUNTS_PER_CLUSTER {
  const counts: TELEMETRY_LAYER_TYPE_COUNTS_PER_MAP[] = layerLists.map(getTelemetyLayerTypesPerMap);

  const clusterCounts: TELEMETRY_LAYER_TYPE_COUNTS_PER_CLUSTER = {};

  counts.forEach((count: TELEMETRY_LAYER_TYPE_COUNTS_PER_MAP) => {
    for (const key in count) {
      if (!count.hasOwnProperty(key)) {
        continue;
      }

      const telemetryLayerType = key as TELEMETRY_LAYER_TYPE;
      if (!clusterCounts[telemetryLayerType]) {
        clusterCounts[telemetryLayerType] = {
          min: count[telemetryLayerType] as number,
          max: count[telemetryLayerType] as number,
          total: count[telemetryLayerType] as number,
          avg: count[telemetryLayerType] as number,
        };
      } else {
        (clusterCounts[telemetryLayerType] as ClusterCounts).min = Math.min(
          count[telemetryLayerType] as number,
          (clusterCounts[telemetryLayerType] as ClusterCounts).min
        );
        (clusterCounts[telemetryLayerType] as ClusterCounts).max = Math.max(
          count[telemetryLayerType] as number,
          (clusterCounts[telemetryLayerType] as ClusterCounts).max
        );
        (clusterCounts[telemetryLayerType] as ClusterCounts).total =
          (count[telemetryLayerType] as number) +
          (clusterCounts[telemetryLayerType] as ClusterCounts).total;
      }
    }
  });

  for (const key in clusterCounts) {
    if (!clusterCounts.hasOwnProperty(key)) {
      continue;
    }

    (clusterCounts[key as TELEMETRY_LAYER_TYPE] as ClusterCounts).avg =
      (clusterCounts[key as TELEMETRY_LAYER_TYPE] as ClusterCounts).total / layerLists.length;
  }

  return clusterCounts;
}
