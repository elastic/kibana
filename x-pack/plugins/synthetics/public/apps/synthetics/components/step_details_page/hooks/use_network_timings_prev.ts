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

export const useNetworkTimingsPrevious24Hours = (stepIndexArg?: number) => {
  const params = useParams<{ checkGroupId: string; stepIndex: string; monitorId: string }>();

  const configId = params.monitorId;
  const checkGroupId = params.checkGroupId;
  const stepIndex = stepIndexArg ?? Number(params.stepIndex);

  const runTimeMappings = NETWORK_TIMINGS_FIELDS.reduce(
    (acc, field) => ({
      ...acc,
      [field]: {
        type: 'double',
      },
    }),
    {}
  );

  const { data } = useReduxEsSearch(
    {
      index: SYNTHETICS_INDEX_PATTERN,
      body: {
        size: 0,
        runtime_mappings: {
          ...runTimeMappings,
          'synthetics.payload.is_navigation_request': {
            type: 'boolean',
          },
        },
        query: {
          bool: {
            filter: [
              {
                range: {
                  '@timestamp': {
                    lte: 'now',
                    gte: 'now-24h/h',
                  },
                },
              },
              {
                term: {
                  'synthetics.payload.is_navigation_request': true,
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
          dns: {
            percentiles: {
              field: SYNTHETICS_DNS_TIMINGS,
              percents: [50],
            },
          },
          ssl: {
            percentiles: {
              field: SYNTHETICS_SSL_TIMINGS,
              percents: [50],
            },
          },
          blocked: {
            percentiles: {
              field: SYNTHETICS_BLOCKED_TIMINGS,
              percents: [50],
            },
          },
          connect: {
            percentiles: {
              field: SYNTHETICS_CONNECT_TIMINGS,
              percents: [50],
            },
          },
          receive: {
            percentiles: {
              field: SYNTHETICS_RECEIVE_TIMINGS,
              percents: [50],
            },
          },
          send: {
            percentiles: {
              field: SYNTHETICS_SEND_TIMINGS,
              percents: [50],
            },
          },
          wait: {
            percentiles: {
              field: SYNTHETICS_WAIT_TIMINGS,
              percents: [50],
            },
          },
          total: {
            percentiles: {
              field: SYNTHETICS_TOTAL_TIMINGS,
              percents: [50],
            },
          },
        },
      },
    },
    [configId, stepIndex, checkGroupId],
    { name: `stepNetworkPreviousTimings/${configId}/${stepIndex}` }
  );

  const aggs = data?.aggregations;

  const timings = {
    dns: aggs?.dns.values['50.0'] ?? 0,
    connect: aggs?.connect.values['50.0'] ?? 0,
    receive: aggs?.receive.values['50.0'] ?? 0,
    send: aggs?.send.values['50.0'] ?? 0,
    wait: aggs?.wait.values['50.0'] ?? 0,
    blocked: aggs?.blocked.values['50.0'] ?? 0,
    ssl: aggs?.ssl.values['50.0'] ?? 0,
  };

  return {
    timings,
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
