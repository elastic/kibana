/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import uuid from 'uuid/v4';
import { AggDescriptor, LayerDescriptor } from '../../../../common/descriptor_types';
import {
  AGG_TYPE,
  FIELD_ORIGIN,
  GRID_RESOLUTION,
  RENDER_AS,
  STYLE_TYPE,
  VECTOR_STYLES,
} from '../../../../common/constants';
import { getJoinAggKey } from '../../../../common/get_join_key';
import { OBSERVABILITY_LAYER_TYPE } from './layer_select';
import { OBSERVABILITY_METRIC_TYPE } from './metric_select';
import { DISPLAY } from './display_select';
import { VectorStyle } from '../../styles/vector/vector_style';
import { EMSFileSource } from '../../sources/ems_file_source';
import { ESGeoGridSource } from '../../sources/es_geo_grid_source';
import { VectorLayer } from '../../vector_layer';
import { HeatmapLayer } from '../../heatmap_layer';

// redefining APM constant to avoid making maps app depend on APM plugin
const APM_INDEX_PATTERN_ID = 'apm_static_index_pattern_id';

function createAggDescriptor(metric: OBSERVABILITY_METRIC_TYPE): AggDescriptor {
  if (metric === OBSERVABILITY_METRIC_TYPE.TRANSACTION_DURATION) {
    return {
      type: AGG_TYPE.AVG,
      field: 'transaction.duration.us',
    };
  } else if (metric === OBSERVABILITY_METRIC_TYPE.SLA_PERCENTAGE) {
    return {
      type: AGG_TYPE.AVG,
      field: 'duration_sla_pct',
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
  if (layer === OBSERVABILITY_LAYER_TYPE.APM_RUM_PERFORMANCE || layer === APM_RUM_TRAFFIC) {
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
    return RENDER_AS.GRIDS;
  }

  return RENDER_AS.POINT;
}

export function createLayerDescriptor({
  layer,
  metric,
  display,
}: {
  layer: OBSERVABILITY_LAYER_TYPE;
  metric: OBSERVABILITY_METRIC_TYPE;
  display: DISPLAY;
}): LayerDescriptor | null {
  if (!layer || !metric || !display) {
    return null;
  }

  const apmSourceQuery = createAmpSourceQuery(layer);
  const metricsDescriptor = createAggDescriptor(metric);

  if (display === DISPLAY.CHOROPLETH) {
    const joinId = uuid();
    const joinKey = getJoinAggKey({
      aggType: metricsDescriptor.type,
      aggFieldName: metricsDescriptor.field ? metricsDescriptor.field : '',
      rightSourceId: joinId,
    });
    return VectorLayer.createDescriptor({
      joins: [
        {
          leftField: 'iso2',
          right: {
            id: joinId,
            indexPatternId: APM_INDEX_PATTERN_ID,
            indexPatternTitle: 'apm-*', // TODO look up from APM_OSS.indexPattern
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
        [VECTOR_STYLES.FILL_COLOR]: {
          type: STYLE_TYPE.DYNAMIC,
          options: {
            field: {
              name: joinKey,
              origin: FIELD_ORIGIN.JOIN,
            },
            color: 'Yellow to Red',
          },
        },
      }),
    });
  }

  const geoGridSourceDescriptor = ESGeoGridSource.createDescriptor({
    indexPatternId: APM_INDEX_PATTERN_ID,
    geoField: 'client.geo.location',
    requestType: getGeoGridRequestType(display),
    resolution: GRID_RESOLUTION.MOST_FINE,
  });

  if (display === DISPLAY.HEATMAP) {
    return HeatmapLayer.createDescriptor({
      query: apmSourceQuery,
      sourceDescriptor: geoGridSourceDescriptor,
    });
  }
}
