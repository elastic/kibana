/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { ElasticsearchMappingOf } from '../../server/utils/typed_elasticsearch_mappings';
import {
  MetricsExplorerOptions,
  MetricsExplorerChartOptions,
  MetricsExplorerTimeOptions,
  // eslint-disable-next-line @kbn/eslint/no-restricted-paths
} from '../../public/containers/metrics_explorer/use_metrics_explorer_options';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { SavedViewSavedObject } from '../../public/hooks/use_saved_view';

interface MetricsExplorerSavedView {
  options: MetricsExplorerOptions;
  chartOptions: MetricsExplorerChartOptions;
  currentTimerange: MetricsExplorerTimeOptions;
}

export const metricsExplorerViewSavedObjectType = 'metrics-explorer-view';

export const metricsExplorerViewSavedObjectMappings: {
  [metricsExplorerViewSavedObjectType]: ElasticsearchMappingOf<
    SavedViewSavedObject<MetricsExplorerSavedView>
  >;
} = {
  [metricsExplorerViewSavedObjectType]: {
    properties: {
      name: {
        type: 'keyword',
      },
      options: {
        properties: {
          metrics: {
            type: 'nested',
            properties: {
              aggregation: {
                type: 'keyword',
              },
              field: {
                type: 'keyword',
              },
              color: {
                type: 'keyword',
              },
              label: {
                type: 'keyword',
              },
            },
          },
          limit: {
            type: 'integer',
          },
          groupBy: {
            type: 'keyword',
          },
          filterQuery: {
            type: 'keyword',
          },
          aggregation: {
            type: 'keyword',
          },
        },
      },
      chartOptions: {
        properties: {
          type: {
            type: 'keyword',
          },
          yAxisMode: {
            type: 'keyword',
          },
          stack: {
            type: 'boolean',
          },
        },
      },
      currentTimerange: {
        properties: {
          from: {
            type: 'keyword',
          },
          to: {
            type: 'keyword',
          },
          interval: {
            type: 'keyword',
          },
        },
      },
    },
  },
};
