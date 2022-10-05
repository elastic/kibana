/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEsSearch } from '@kbn/observability-plugin/public';
import {
  NETWORK_TIMINGS_FIELDS,
  SYNTHETICS_BLOCKED_TIMINGS,
  SYNTHETICS_CONNECT_TIMINGS,
  SYNTHETICS_DNS_TIMINGS,
  SYNTHETICS_RECEIVE_TIMINGS,
  SYNTHETICS_SEND_TIMINGS,
  SYNTHETICS_SSL_TIMINGS,
  SYNTHETICS_STEP_DURATION,
  SYNTHETICS_TOTAL_TIMINGS,
  SYNTHETICS_WAIT_TIMINGS,
} from '@kbn/observability-plugin/common';
import { useParams } from 'react-router-dom';

export const useStepFilters = (prevCheckGroupId?: string) => {
  const { checkGroupId, stepIndex } = useParams<{ checkGroupId: string; stepIndex: string }>();
  return [
    {
      term: {
        'monitor.check_group': prevCheckGroupId ?? checkGroupId,
      },
    },
    {
      term: {
        'synthetics.step.index': Number(stepIndex),
      },
    },
  ];
};

export const useNetworkTimings = () => {
  const runTimeMappings = NETWORK_TIMINGS_FIELDS.reduce(
    (acc, field) => ({
      ...acc,
      [field]: {
        type: 'double',
      },
    }),
    {}
  );

  const networkAggs = NETWORK_TIMINGS_FIELDS.reduce(
    (acc, field) => ({
      ...acc,
      [field]: {
        sum: {
          field,
        },
      },
    }),
    {}
  );

  const { data } = useEsSearch(
    {
      index: 'synthetics-*',
      body: {
        size: 0,
        runtime_mappings: runTimeMappings,
        query: {
          bool: {
            filter: [
              {
                term: {
                  'synthetics.type': 'journey/network_info',
                },
              },
              ...useStepFilters(),
            ],
          },
        },
        aggs: {
          ...networkAggs,
          totalDuration: {
            sum: {
              field: SYNTHETICS_STEP_DURATION,
            },
          },
          dns: {
            sum: {
              field: SYNTHETICS_DNS_TIMINGS,
            },
          },
          ssl: {
            sum: {
              field: SYNTHETICS_SSL_TIMINGS,
            },
          },
          blocked: {
            sum: {
              field: SYNTHETICS_BLOCKED_TIMINGS,
            },
          },
          connect: {
            sum: {
              field: SYNTHETICS_CONNECT_TIMINGS,
            },
          },
          receive: {
            sum: {
              field: SYNTHETICS_RECEIVE_TIMINGS,
            },
          },
          send: {
            sum: {
              field: SYNTHETICS_SEND_TIMINGS,
            },
          },
          wait: {
            sum: {
              field: SYNTHETICS_WAIT_TIMINGS,
            },
          },
          total: {
            sum: {
              field: SYNTHETICS_TOTAL_TIMINGS,
            },
          },
        },
      },
    },
    [],
    { name: 'networkTimings' }
  );

  const aggs = data?.aggregations;

  return {
    timings: {
      dns: aggs?.dns.value ?? 0,
      connect: aggs?.connect.value ?? 0,
      receive: aggs?.receive.value ?? 0,
      send: aggs?.send.value ?? 0,
      wait: aggs?.wait.value ?? 0,
      blocked: aggs?.blocked.value ?? 0,
      ssl: aggs?.ssl.value ?? 0,
      total: aggs?.total.value ?? 0,
    },
    totalDuration: aggs?.totalDuration.value ?? 0,
  };
};
