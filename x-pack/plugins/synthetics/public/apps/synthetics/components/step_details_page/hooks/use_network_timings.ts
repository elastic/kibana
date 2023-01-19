/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useParams } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
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
import { SYNTHETICS_INDEX_PATTERN } from '../../../../../../common/constants';

export const useStepFilters = (checkGroupIdArg?: string, stepIndexArg?: number) => {
  const { checkGroupId, stepIndex } = useParams<{ checkGroupId: string; stepIndex: string }>();
  return [
    {
      term: {
        'monitor.check_group': checkGroupIdArg ?? checkGroupId,
      },
    },
    {
      term: {
        'synthetics.step.index': stepIndexArg ?? Number(stepIndex),
      },
    },
  ];
};

export const useNetworkTimings = (checkGroupIdArg?: string, stepIndexArg?: number) => {
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
      index: SYNTHETICS_INDEX_PATTERN,
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
              ...useStepFilters(checkGroupIdArg, stepIndexArg),
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
    [checkGroupIdArg, stepIndexArg],
    { name: 'networkTimings' }
  );

  const aggs = data?.aggregations;

  const timings = {
    dns: aggs?.dns.value ?? 0,
    connect: aggs?.connect.value ?? 0,
    receive: aggs?.receive.value ?? 0,
    send: aggs?.send.value ?? 0,
    wait: aggs?.wait.value ?? 0,
    blocked: aggs?.blocked.value ?? 0,
    ssl: aggs?.ssl.value ?? 0,
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
    totalDuration: aggs?.totalDuration.value ?? 0,
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
