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
} from '../../../../../common/descriptor_types';
import {
  AGG_TYPE,
  COLOR_MAP_TYPE,
  FIELD_ORIGIN,
  GRID_RESOLUTION,
  RENDER_AS,
  SOURCE_TYPES,
  STYLE_TYPE,
  VECTOR_STYLES,
} from '../../../../../common/constants';
import { getJoinAggKey, getSourceAggKey } from '../../../../../common/get_agg_key';
import { OBSERVABILITY_LAYER_TYPE } from './layer_select';
import { OBSERVABILITY_METRIC_TYPE } from './metric_select';
import { DISPLAY } from './display_select';
import { VectorStyle } from '../../../styles/vector/vector_style';
// @ts-ignore
import { EMSFileSource } from '../../../sources/ems_file_source';
// @ts-ignore
import { ESGeoGridSource } from '../../../sources/es_geo_grid_source';
import { VectorLayer } from '../../vector_layer/vector_layer';
// @ts-ignore
import { HeatmapLayer } from '../../heatmap_layer/heatmap_layer';
import { getDefaultDynamicProperties } from '../../../styles/vector/vector_style_defaults';

// redefining APM constant to avoid making maps app depend on APM plugin
export const APM_INDEX_PATTERN_ID = 'apm_static_index_pattern_id';
export const APM_INDEX_PATTERN_TITLE = 'apm-*';

const defaultDynamicProperties = getDefaultDynamicProperties();

function createDynamicFillColorDescriptor(
  layer: OBSERVABILITY_LAYER_TYPE,
  field: StylePropertyField
) {
  return {
    type: STYLE_TYPE.DYNAMIC,
    options: {
      ...(defaultDynamicProperties[VECTOR_STYLES.FILL_COLOR]!.options as ColorDynamicOptions),
      field,
      color:
        layer === OBSERVABILITY_LAYER_TYPE.APM_RUM_PERFORMANCE ? 'Green to Red' : 'Yellow to Red',
      type: COLOR_MAP_TYPE.ORDINAL,
    },
  };
}

function createLayerLabel(
  layer: OBSERVABILITY_LAYER_TYPE,
  metric: OBSERVABILITY_METRIC_TYPE
): string | null {
  let layerName;
  if (layer === OBSERVABILITY_LAYER_TYPE.APM_RUM_PERFORMANCE) {
    layerName = i18n.translate('xpack.maps.observability.apmRumPerformanceLayerName', {
      defaultMessage: 'Performance',
    });
  } else if (layer === OBSERVABILITY_LAYER_TYPE.APM_RUM_TRAFFIC) {
    layerName = i18n.translate('xpack.maps.observability.apmRumTrafficLayerName', {
      defaultMessage: 'Traffic',
    });
  }

  let metricName;
  if (metric === OBSERVABILITY_METRIC_TYPE.TRANSACTION_DURATION) {
    metricName = i18n.translate('xpack.maps.observability.durationMetricName', {
      defaultMessage: 'Duration',
    });
  } else if (metric === OBSERVABILITY_METRIC_TYPE.COUNT) {
    metricName = i18n.translate('xpack.maps.observability.countMetricName', {
      defaultMessage: 'Total',
    });
  } else if (metric === OBSERVABILITY_METRIC_TYPE.UNIQUE_COUNT) {
    metricName = i18n.translate('xpack.maps.observability.uniqueCountMetricName', {
      defaultMessage: 'Unique count',
    });
  }

  return `[${layerName}] ${metricName}`;
}

function createAggDescriptor(metric: OBSERVABILITY_METRIC_TYPE): AggDescriptor {
  if (metric === OBSERVABILITY_METRIC_TYPE.TRANSACTION_DURATION) {
    return {
      type: AGG_TYPE.AVG,
      field: 'transaction.duration.us',
    };
  } else if (metric === OBSERVABILITY_METRIC_TYPE.UNIQUE_COUNT) {
    return {
      type: AGG_TYPE.UNIQUE_COUNT,
      field: 'transaction.id',
    };
  } else {
    return { type: AGG_TYPE.COUNT };
  }
}

// All APM indices match APM index pattern. Need to apply query to filter to specific document types
// https://www.elastic.co/guide/en/kibana/current/apm-settings-kb.html
function createAmpSourceQuery(layer: OBSERVABILITY_LAYER_TYPE) {
  // APM transaction documents
  let query;
  if (
    layer === OBSERVABILITY_LAYER_TYPE.APM_RUM_PERFORMANCE ||
    layer === OBSERVABILITY_LAYER_TYPE.APM_RUM_TRAFFIC
  ) {
    query = 'processor.event:"transaction"';
  }

  return query
    ? {
        language: 'kuery',
        query,
      }
    : undefined;
}

function getGeoGridRequestType(display: DISPLAY): RENDER_AS {
  if (display === DISPLAY.HEATMAP) {
    return RENDER_AS.HEATMAP;
  }

  if (display === DISPLAY.GRIDS) {
    return RENDER_AS.GRID;
  }

  return RENDER_AS.POINT;
}

export function createLayerDescriptor({
  layer,
  metric,
  display,
}: {
  layer: OBSERVABILITY_LAYER_TYPE | null;
  metric: OBSERVABILITY_METRIC_TYPE | null;
  display: DISPLAY | null;
}): LayerDescriptor | null {
  if (!layer || !metric || !display) {
    return null;
  }

  const apmSourceQuery = createAmpSourceQuery(layer);
  const label = createLayerLabel(layer, metric);
  const metricsDescriptor = createAggDescriptor(metric);

  if (display === DISPLAY.CHOROPLETH) {
    const joinId = uuid();
    const joinKey = getJoinAggKey({
      aggType: metricsDescriptor.type,
      aggFieldName: metricsDescriptor.field ? metricsDescriptor.field : '',
      rightSourceId: joinId,
    });
    return VectorLayer.createDescriptor({
      label,
      joins: [
        {
          leftField: 'iso2',
          right: {
            type: SOURCE_TYPES.ES_TERM_SOURCE,
            id: joinId,
            indexPatternId: APM_INDEX_PATTERN_ID,
            indexPatternTitle: APM_INDEX_PATTERN_TITLE, // TODO look up from APM_OSS.indexPattern
            term: 'client.geo.country_iso_code',
            metrics: [metricsDescriptor],
            whereQuery: apmSourceQuery,
          },
        },
      ],
      sourceDescriptor: EMSFileSource.createDescriptor({
        id: 'world_countries',
        tooltipProperties: ['name', 'iso2'],
      }),
      style: VectorStyle.createDescriptor({
        [VECTOR_STYLES.FILL_COLOR]: createDynamicFillColorDescriptor(layer, {
          name: joinKey,
          origin: FIELD_ORIGIN.JOIN,
        }),
        [VECTOR_STYLES.LINE_COLOR]: {
          type: STYLE_TYPE.STATIC,
          options: {
            color: '#3d3d3d',
          },
        },
      }),
    });
  }

  const geoGridSourceDescriptor = ESGeoGridSource.createDescriptor({
    indexPatternId: APM_INDEX_PATTERN_ID,
    geoField: 'client.geo.location',
    metrics: [metricsDescriptor],
    requestType: getGeoGridRequestType(display),
    resolution: GRID_RESOLUTION.MOST_FINE,
  });

  if (display === DISPLAY.HEATMAP) {
    return HeatmapLayer.createDescriptor({
      label,
      query: apmSourceQuery,
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
    [VECTOR_STYLES.FILL_COLOR]: createDynamicFillColorDescriptor(layer, metricStyleField),
    [VECTOR_STYLES.ICON_SIZE]: {
      type: STYLE_TYPE.DYNAMIC,
      options: {
        ...(defaultDynamicProperties[VECTOR_STYLES.ICON_SIZE]!.options as SizeDynamicOptions),
        field: metricStyleField,
      },
    },
    [VECTOR_STYLES.LINE_COLOR]: {
      type: STYLE_TYPE.STATIC,
      options: {
        color: '#3d3d3d',
      },
    },
  };

  return VectorLayer.createDescriptor({
    label,
    query: apmSourceQuery,
    sourceDescriptor: geoGridSourceDescriptor,
    style: VectorStyle.createDescriptor(styleProperties),
  });
}
