/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euiThemeVars } from '@kbn/ui-shared-deps/theme';
import { i18n } from '@kbn/i18n';
import { withApmSpan } from '../../../../../utils/with_apm_span';
import {
  METRIC_JAVA_HEAP_MEMORY_MAX,
  METRIC_JAVA_HEAP_MEMORY_COMMITTED,
  METRIC_JAVA_HEAP_MEMORY_USED,
  AGENT_NAME,
} from '../../../../../../common/elasticsearch_fieldnames';
import { Setup, SetupTimeRange } from '../../../../helpers/setup_request';
import { fetchAndTransformMetrics } from '../../../fetch_and_transform_metrics';
import { ChartBase } from '../../../types';

const series = {
  heapMemoryUsed: {
    title: i18n.translate('xpack.apm.agentMetrics.java.heapMemorySeriesUsed', {
      defaultMessage: 'Avg. used',
    }),
    color: euiThemeVars.euiColorVis0,
  },
  heapMemoryCommitted: {
    title: i18n.translate(
      'xpack.apm.agentMetrics.java.heapMemorySeriesCommitted',
      {
        defaultMessage: 'Avg. committed',
      }
    ),
    color: euiThemeVars.euiColorVis1,
  },
  heapMemoryMax: {
    title: i18n.translate('xpack.apm.agentMetrics.java.heapMemorySeriesMax', {
      defaultMessage: 'Avg. limit',
    }),
    color: euiThemeVars.euiColorVis2,
  },
};

const chartBase: ChartBase = {
  title: i18n.translate('xpack.apm.agentMetrics.java.heapMemoryChartTitle', {
    defaultMessage: 'Heap Memory',
  }),
  key: 'heap_memory_area_chart',
  type: 'area',
  yUnit: 'bytes',
  series,
};

export function getHeapMemoryChart({
  environment,
  kuery,
  setup,
  serviceName,
  serviceNodeName,
}: {
  environment?: string;
  kuery?: string;
  setup: Setup & SetupTimeRange;
  serviceName: string;
  serviceNodeName?: string;
}) {
  return withApmSpan('get_heap_memory_charts', () =>
    fetchAndTransformMetrics({
      environment,
      kuery,
      setup,
      serviceName,
      serviceNodeName,
      chartBase,
      aggs: {
        heapMemoryMax: { avg: { field: METRIC_JAVA_HEAP_MEMORY_MAX } },
        heapMemoryCommitted: {
          avg: { field: METRIC_JAVA_HEAP_MEMORY_COMMITTED },
        },
        heapMemoryUsed: { avg: { field: METRIC_JAVA_HEAP_MEMORY_USED } },
      },
      additionalFilters: [{ term: { [AGENT_NAME]: 'java' } }],
    })
  );
}
