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

export const useNetworkTimings = (checkGroupIdArg?: string, stepIndexArg?: number) => {
  const params = useParams<{ checkGroupId: string; stepIndex: string; monitorId: string }>();

  const checkGroupId = checkGroupIdArg ?? params.checkGroupId;
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
        runtime_mappings: runTimeMappings,

        query: {
          bool: {
            filter: [
              {
                term: {
                  'synthetics.type': 'journey/network_info',
                },
              },
              ...useStepFilters(checkGroupId, stepIndex),
            ],
          },
        },
        aggs: {
          dns: {
            sum: {
              field: SYNTHETICS_DNS_TIMINGS,
            },
          },
          tls: {
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
    { name: `stepNetworkTimingsMetrics/${checkGroupId}/${stepIndex}` }
  );

  const aggs = data?.aggregations;

  const timings = {
    dns: aggs?.dns.value ?? 0,
    connect: aggs?.connect.value ?? 0,
    receive: aggs?.receive.value ?? 0,
    send: aggs?.send.value ?? 0,
    wait: aggs?.wait.value ?? 0,
    blocked: aggs?.blocked.value ?? 0,
    tls: aggs?.tls.value ?? 0,
  };

  return {
    timings,
    timingsWithLabels: getTimingWithLabels(timings),
  };
};

export const getTimingWithLabels = (timings: Record<string, number>) => {
  return [
    {
      value: timings.blocked,
      label: SYNTHETICS_BLOCKED_TIMINGS_LABEL,
    },
    {
      value: timings.dns,
      label: SYNTHETICS_DNS_TIMINGS_LABEL,
    },
    {
      value: timings.connect,
      label: SYNTHETICS_CONNECT_TIMINGS_LABEL,
    },
    {
      value: timings.tls,
      label: SYNTHETICS_TLS_TIMINGS_LABEL,
    },
    {
      value: timings.wait,
      label: SYNTHETICS_WAIT_TIMINGS_LABEL,
    },
    {
      value: timings.receive,
      label: SYNTHETICS_RECEIVE_TIMINGS_LABEL,
    },
    {
      value: timings.send,
      label: SYNTHETICS_SEND_TIMINGS_LABEL,
    },
  ];
};

export const SYNTHETICS_CONNECT_TIMINGS_LABEL = i18n.translate('xpack.synthetics.connect.label', {
  defaultMessage: 'Connect',
});
export const SYNTHETICS_DNS_TIMINGS_LABEL = i18n.translate('xpack.synthetics.dns', {
  defaultMessage: 'DNS',
});
export const SYNTHETICS_WAIT_TIMINGS_LABEL = i18n.translate('xpack.synthetics.wait', {
  defaultMessage: 'Wait',
});

export const SYNTHETICS_TLS_TIMINGS_LABEL = i18n.translate('xpack.synthetics.tls', {
  defaultMessage: 'TLS',
});
export const SYNTHETICS_BLOCKED_TIMINGS_LABEL = i18n.translate('xpack.synthetics.blocked', {
  defaultMessage: 'Blocked',
});
export const SYNTHETICS_SEND_TIMINGS_LABEL = i18n.translate('xpack.synthetics.send', {
  defaultMessage: 'Send',
});
export const SYNTHETICS_RECEIVE_TIMINGS_LABEL = i18n.translate('xpack.synthetics.receive', {
  defaultMessage: 'Receive',
});
