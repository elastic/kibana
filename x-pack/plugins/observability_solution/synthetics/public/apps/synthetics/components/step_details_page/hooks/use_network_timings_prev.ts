/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useParams } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import {
  NETWORK_TIMINGS_FIELDS,
  SYNTHETICS_BLOCKED_TIMINGS,
  SYNTHETICS_CONNECT_TIMINGS,
  SYNTHETICS_DNS_TIMINGS,
  SYNTHETICS_RECEIVE_TIMINGS,
  SYNTHETICS_SEND_TIMINGS,
  SYNTHETICS_SSL_TIMINGS,
  SYNTHETICS_TOTAL_TIMINGS,
  SYNTHETICS_WAIT_TIMINGS,
} from '@kbn/observability-shared-plugin/common';
import moment from 'moment';
import { useJourneySteps } from '../../monitor_details/hooks/use_journey_steps';
import { SYNTHETICS_INDEX_PATTERN } from '../../../../../../common/constants';
import { useReduxEsSearch } from '../../../hooks/use_redux_es_search';
import { getTimingWithLabels } from './use_network_timings';

export const useStepFilters = (checkGroupId: string, stepIndex: number) => {
  return [
    {
      term: {
        'monitor.check_group': checkGroupId,
      },
    },
    {
      term: {
        'synthetics.step.index': stepIndex,
      },
    },
  ];
};

export const useNetworkTimingsPrevious24Hours = (
  stepIndexArg?: number,
  timestampArg?: string,
  checkGroupIdArg?: string
) => {
  const params = useParams<{ checkGroupId: string; stepIndex: string; monitorId: string }>();

  const configId = params.monitorId;
  const checkGroupId = checkGroupIdArg ?? params.checkGroupId;
  const stepIndex = stepIndexArg ?? Number(params.stepIndex);

  const { currentStep } = useJourneySteps();

  const timestamp = timestampArg ?? currentStep?.['@timestamp'];

  const runTimeMappings = NETWORK_TIMINGS_FIELDS.reduce(
    (acc, field) => ({
      ...acc,
      [field]: {
        type: 'double',
      },
    }),
    {}
  );

  const { data, loading } = useReduxEsSearch(
    {
      index: SYNTHETICS_INDEX_PATTERN,
      body: {
        size: 0,
        runtime_mappings: runTimeMappings,
        query: {
          bool: {
            filter: [
              {
                range: {
                  '@timestamp': {
                    lte: moment(timestamp).toISOString(),
                    gte: moment(timestamp).subtract(24, 'hours').toISOString(),
                  },
                },
              },
              {
                term: {
                  'synthetics.type': 'journey/network_info',
                },
              },
              {
                term: {
                  'synthetics.step.index': stepIndex,
                },
              },
              {
                term: {
                  config_id: configId,
                },
              },
            ],
            must_not: [
              {
                term: {
                  'monitor.check_group': checkGroupId,
                },
              },
            ],
          },
        },
        aggs: {
          testRuns: {
            terms: {
              field: 'monitor.check_group',
              size: 10000,
            },
            aggs: {
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
      },
    },
    [],
    {
      name: `stepNetworkPreviousTimings/${configId}/${checkGroupId}/${stepIndex}`,
      isRequestReady: Boolean(timestamp),
    }
  );

  const aggs = data?.aggregations;

  const dns: number[] = [];
  const connect: number[] = [];
  const receive: number[] = [];
  const send: number[] = [];
  const wait: number[] = [];
  const blocked: number[] = [];
  const ssl: number[] = [];

  aggs?.testRuns.buckets.forEach((bucket) => {
    dns.push(bucket.dns.value ?? 0);
    connect.push(bucket.connect.value ?? 0);
    receive.push(bucket.receive.value ?? 0);
    send.push(bucket.send.value ?? 0);
    wait.push(bucket.wait.value ?? 0);
    blocked.push(bucket.blocked.value ?? 0);
    ssl.push(bucket.ssl.value ?? 0);
  });

  const timings = {
    dns: median(dns),
    connect: median(connect),
    receive: median(receive),
    send: median(send),
    wait: median(wait),
    blocked: median(blocked),
    ssl: median(ssl),
  };

  return {
    loading: loading && !data,
    timings,
    timingsWithLabels: getTimingWithLabels(timings),
  };
};

export const median = (arr: number[]): number => {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[mid - 1] + s[mid]) / 2 : s[mid];
};

export const CONTENT_SIZE_LABEL = i18n.translate('xpack.synthetics.contentSize', {
  defaultMessage: 'Content Size',
});
