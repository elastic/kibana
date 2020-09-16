/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import uuid from 'uuid/v4';
import { i18n } from '@kbn/i18n';
import {
  AggDescriptor,
  ColorDynamicOptions,
  LayerDescriptor,
  SizeDynamicOptions,
  StylePropertyField,
  VectorStylePropertiesDescriptor,
} from '../../../common/descriptor_types';
import {
  AGG_TYPE,
  COLOR_MAP_TYPE,
  FIELD_ORIGIN,
  GRID_RESOLUTION,
  RENDER_AS,
  SOURCE_TYPES,
  STYLE_TYPE,
  VECTOR_STYLES,
} from '../../../common/constants';
import { VectorStyle } from '../styles/vector/vector_style';
// @ts-ignore
import { ESGeoGridSource } from '../sources/es_geo_grid_source';
import { VectorLayer } from './vector_layer/vector_layer';
// @ts-ignore
import { HeatmapLayer } from './heatmap_layer/heatmap_layer';
import { getDefaultDynamicProperties } from '../styles/vector/vector_style_defaults';
import { getSourceAggKey } from '../../../common/get_agg_key';

const defaultDynamicProperties = getDefaultDynamicProperties();

function getGeoGridRequestType(mapType: string): RENDER_AS {
  if (mapType === 'Heatmap') {
    return RENDER_AS.HEATMAP;
  }

  if (mapType === 'Shaded Geohash Grid') {
    return RENDER_AS.GRID;
  }

  return RENDER_AS.POINT;
}

function createAggDescriptor(metricAgg: string, metricFieldName?: string): AggDescriptor {
  return { type: AGG_TYPE.COUNT };
}

export function createTileMapLayerDescriptor({
  title,
  mapType,
  indexPatternId,
  geoFieldName,
  metricAgg,
  metricFieldName,
}: {
  title?: string;
  mapType: string;
  indexPatternId: string;
  geoFieldName?: string;
  metricAgg: string;
  metricFieldName?: string;
}): LayerDescriptor | null {
  if (!geoFieldName) {
    return null;
  }

  const label = title ? title : 'Coordinate map';
  const metricsDescriptor = createAggDescriptor(metricAgg, metricFieldName);
  const geoGridSourceDescriptor = ESGeoGridSource.createDescriptor({
    indexPatternId,
    geoField: geoFieldName,
    metrics: [metricsDescriptor],
    requestType: getGeoGridRequestType(mapType),
    resolution: GRID_RESOLUTION.MOST_FINE,
  });

  if (mapType === 'Heatmap') {
    return HeatmapLayer.createDescriptor({
      label,
      sourceDescriptor: geoGridSourceDescriptor,
    });
  }

  const metricSourceKey = getSourceAggKey({
    aggType: metricsDescriptor.type,
    aggFieldName: metricsDescriptor.field,
  });
  const metricStyleField = {
    name: metricSourceKey,
    origin: FIELD_ORIGIN.SOURCE,
  };

  const styleProperties: VectorStylePropertiesDescriptor = {
    [VECTOR_STYLES.FILL_COLOR]: {
      type: STYLE_TYPE.DYNAMIC,
      options: {
        ...(defaultDynamicProperties[VECTOR_STYLES.FILL_COLOR]!.options as ColorDynamicOptions),
        field: metricStyleField,
        color: 'Yellow to Red',
        type: COLOR_MAP_TYPE.ORDINAL,
      },
    },
    [VECTOR_STYLES.LINE_COLOR]: {
      type: STYLE_TYPE.STATIC,
      options: {
        color: '#3d3d3d',
      },
    },
  };

  /*
  [VECTOR_STYLES.ICON_SIZE]: {
      type: STYLE_TYPE.DYNAMIC,
      options: {
        ...(defaultDynamicProperties[VECTOR_STYLES.ICON_SIZE]!.options as SizeDynamicOptions),
        field: metricStyleField,
      },
    }
}
*/

  return VectorLayer.createDescriptor({
    label,
    sourceDescriptor: geoGridSourceDescriptor,
    style: VectorStyle.createDescriptor(styleProperties),
  });
}
