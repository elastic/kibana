/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { dump } from 'js-yaml';

export const generateSystemLogsYml = ({
  datasetName = 'system',
  namespace = 'default',
  apiKey,
  esHost,
  uuid,
}: {
  datasetName?: string;
  namespace?: string;
  apiKey: string;
  esHost: string[];
  uuid: string;
}) => {
  return dump({
    ...{
      outputs: {
        default: {
          type: 'elasticsearch',
          hosts: esHost,
          api_key: apiKey,
        },
      },
      providers: {
        agent: {
          enabled: true,
        },
      },
      agent: {
        monitoring: {
          enabled: true,
          use_output: 'default',
          namespace,
          logs: true,
          metrics: true,
        },
      },
      inputs: [
        {
          id: `system/metrics-system-${uuid}`,
          type: 'system/metrics',
          data_stream: {
            namespace,
          },
          streams: [
            {
              id: `system/metrics-system.cpu-${uuid}`,
              data_stream: {
                dataset: 'system.cpu',
                type: 'metrics',
              },
              metricsets: ['cpu'],
              cpu: { metrics: ['percentages', 'normalized_percentages'] },
              period: '10s',
            },
            {
              id: `system/metrics-system.memory-${uuid}`,
              data_stream: {
                dataset: 'system.memory',
                type: 'metrics',
              },
              metricsets: ['memory'],
              period: '10s',
            },
          ],
        },
      ],
    },
  });
};
