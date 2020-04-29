/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import uuid from 'uuid/v4';
import { AggDescriptor, LayerDescriptor } from '../../../../common/descriptor_types';
import { AGG_TYPE, FIELD_ORIGIN, STYLE_TYPE, VECTOR_STYLES } from '../../../../common/constants';
import { getJoinAggKey } from '../../../../common/get_join_key';
import { OBSERVABILITY_METRIC_TYPE } from './metric_select';
import { DISPLAY } from './display_select';
import { VectorStyle } from '../../styles/vector/vector_style';
import { EMSFileSource } from '../../sources/ems_file_source';
import { VectorLayer } from '../../vector_layer';

// redefining constant to avoid making maps app depend on APM plugin
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
      type: AGG_TYPE.AVG,
      field: 'transaction.id',
    };
  } else {
    return { type: AGG_TYPE.COUNT };
  }
}

export function createLayerDescriptor({
  metric,
  display,
}: {
  metric: OBSERVABILITY_METRIC_TYPE;
  display: DISPLAY;
}): LayerDescriptor | null {
  if (!metric || !display) {
    return null;
  }

  const metricsDescriptor = createAggDescriptor(metric);

  if (display === DISPLAY.CHOROPLETH) {
    const joinId = uuid();
    const joinKey = getJoinAggKey({
      aggType: metricsDescriptor.type,
      aggFieldName: metricsDescriptor.field ? metricsDescriptor.field : '',
      rightSourceId: joinId,
    });
    const styleProperties: {
      [VECTOR_STYLES.FILL_COLOR]: {
        type: STYLE_TYPE.DYNAMIC;
        options: {
          field: {
            name: joinKey;
            origin: FIELD_ORIGIN.JOIN;
          };
          color: 'Yellow to Red';
        };
      };
    };
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
          },
        },
      ],
      sourceDescriptor: EMSFileSource.createDescriptor({
        id: 'world_countries',
        tooltipProperties: ['name', 'iso2'],
      }),
      style: VectorStyle.createDescriptor(styleProperties),
    });
  }
}
