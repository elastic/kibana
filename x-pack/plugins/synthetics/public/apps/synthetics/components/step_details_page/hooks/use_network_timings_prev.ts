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
} from '@kbn/observability-plugin/common';
import moment from 'moment';
import { useJourneySteps } from '../../monitor_details/hooks/use_journey_steps';
import { SYNTHETICS_INDEX_PATTERN } from '../../../../../../common/constants';
import { useReduxEsSearch } from '../../../hooks/use_redux_es_search';

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

export const useNetworkTimingsPrevious24Hours = (stepIndexArg?: number, timestampArg?: string) => {
  const params = useParams<{ checkGroupId: string; stepIndex: string; monitorId: string }>();

  const configId = params.monitorId;
  const checkGroupId = params.checkGroupId;
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
        runtime_mappings: {
          ...runTimeMappings,
          'synthetics.payload.transfer_size': {
            type: 'long',
          },
        },
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
              transferSize: {
                sum: {
                  field: 'synthetics.payload.transfer_size',
                },
              },
            },
          },
        },
      },
    },
    [configId, stepIndex, checkGroupId],
    {
      name: `stepNetworkPreviousTimings/${configId}/${stepIndex}`,
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
  const transferSize: number[] = [];

  aggs?.testRuns.buckets.forEach((bucket) => {
    dns.push(bucket.dns.value ?? 0);
    connect.push(bucket.connect.value ?? 0);
    receive.push(bucket.receive.value ?? 0);
    send.push(bucket.send.value ?? 0);
    wait.push(bucket.wait.value ?? 0);
    blocked.push(bucket.blocked.value ?? 0);
    ssl.push(bucket.ssl.value ?? 0);
    transferSize.push(bucket.transferSize.value ?? 0);
  });

  const timings = {
    dns: median(dns),
    connect: median(connect),
    receive: median(receive),
    send: median(send),
    wait: median(wait),
    blocked: median(blocked),
    ssl: median(ssl),
    transferSize: median(transferSize),
  };

  return {
    loading,
    timings,
    transferSizePrev: {
      value: timings.transferSize,
      label: CONTENT_SIZE_LABEL,
    },
    timingsWithLabels: [
      {
        value: timings.dns,
        label: SYNTHETICS_DNS_TIMINGS_LABEL,
      },
      {
        value: timings.ssl,
        label: SYNTHETICS_SSL_TIMINGS_LABEL,
      },
      {
        value: timings.blocked,
        label: SYNTHETICS_BLOCKED_TIMINGS_LABEL,
      },
      {
        value: timings.connect,
        label: SYNTHETICS_CONNECT_TIMINGS_LABEL,
      },
      {
        value: timings.receive,
        label: SYNTHETICS_RECEIVE_TIMINGS_LABEL,
      },
      {
        value: timings.send,
        label: SYNTHETICS_SEND_TIMINGS_LABEL,
      },
      {
        value: timings.wait,
        label: SYNTHETICS_WAIT_TIMINGS_LABEL,
      },
    ].sort((a, b) => b.value - a.value),
  };
};

const median = (arr: number[]): number => {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[mid - 1] + s[mid]) / 2 : s[mid];
};

const SYNTHETICS_CONNECT_TIMINGS_LABEL = i18n.translate('xpack.synthetics.connect.label', {
  defaultMessage: 'Connect',
});
const SYNTHETICS_DNS_TIMINGS_LABEL = i18n.translate('xpack.synthetics.dns', {
  defaultMessage: 'DNS',
});
const SYNTHETICS_WAIT_TIMINGS_LABEL = i18n.translate('xpack.synthetics.wait', {
  defaultMessage: 'Wait',
});

const SYNTHETICS_SSL_TIMINGS_LABEL = i18n.translate('xpack.synthetics.ssl', {
  defaultMessage: 'SSL',
});
const SYNTHETICS_BLOCKED_TIMINGS_LABEL = i18n.translate('xpack.synthetics.blocked', {
  defaultMessage: 'Blocked',
});
const SYNTHETICS_SEND_TIMINGS_LABEL = i18n.translate('xpack.synthetics.send', {
  defaultMessage: 'Send',
});
const SYNTHETICS_RECEIVE_TIMINGS_LABEL = i18n.translate('xpack.synthetics.receive', {
  defaultMessage: 'Receive',
});

export const CONTENT_SIZE_LABEL = i18n.translate('xpack.synthetics.contentSize', {
  defaultMessage: 'Content Size',
});
