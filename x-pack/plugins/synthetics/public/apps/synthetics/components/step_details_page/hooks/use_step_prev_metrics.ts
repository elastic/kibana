/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useParams } from 'react-router-dom';
import { useEsSearch } from '@kbn/observability-plugin/public';
import { median } from './use_network_timings_prev';
import { CLS_HELP_LABEL } from '../step_metrics/labels';
import { SYNTHETICS_INDEX_PATTERN } from '../../../../../../common/constants';
import {
  CLS_LABEL,
  DCL_LABEL,
  FCP_LABEL,
  LCP_LABEL,
  STEP_DURATION_LABEL,
  TRANSFER_SIZE,
} from './use_step_metrics';

export const MONITOR_DURATION_US = 'monitor.duration.us';
export const SYNTHETICS_CLS = 'browser.experience.cls';
export const SYNTHETICS_LCP = 'browser.experience.lcp.us';
export const SYNTHETICS_FCP = 'browser.experience.fcp.us';
export const SYNTHETICS_DOCUMENT_ONLOAD = 'browser.experience.load.us';
export const SYNTHETICS_DCL = 'browser.experience.dcl.us';
export const SYNTHETICS_STEP_NAME = 'synthetics.step.name.keyword';
export const SYNTHETICS_STEP_DURATION = 'synthetics.step.duration.us';

export const useStepPrevMetrics = () => {
  const { checkGroupId, stepIndex, monitorId } = useParams<{
    checkGroupId: string;
    stepIndex: string;
    monitorId: string;
  }>();

  const { data, loading } = useEsSearch(
    {
      index: SYNTHETICS_INDEX_PATTERN,
      body: {
        size: 0,
        query: {
          bool: {
            filter: [
              {
                terms: {
                  'synthetics.type': ['step/metrics', 'step/end'],
                },
              },
              {
                term: {
                  'synthetics.step.index': Number(stepIndex),
                },
              },
              {
                term: {
                  config_id: monitorId,
                },
              },
              {
                range: {
                  '@timestamp': {
                    lte: 'now',
                    gte: 'now-24h/h',
                  },
                },
              },
            ],
          },
        },
        aggs: {
          fcp: {
            avg: {
              field: SYNTHETICS_FCP,
            },
          },
          lcp: {
            avg: {
              field: SYNTHETICS_LCP,
            },
          },
          cls: {
            avg: {
              field: SYNTHETICS_CLS,
            },
          },
          dcl: {
            avg: {
              field: SYNTHETICS_DCL,
            },
          },
          totalDuration: {
            avg: {
              field: SYNTHETICS_STEP_DURATION,
            },
          },
        },
      },
    },
    [monitorId, checkGroupId, stepIndex],
    { name: 'previousStepMetrics' }
  );

  const { data: transferData } = useEsSearch(
    {
      index: SYNTHETICS_INDEX_PATTERN,
      body: {
        size: 0,
        runtime_mappings: {
          'synthetics.payload.transfer_size': {
            type: 'double',
          },
          'synthetics.payload.resource_size': {
            type: 'double',
          },
        },
        query: {
          bool: {
            filter: [
              {
                term: {
                  'synthetics.type': 'journey/network_info',
                },
              },
              {
                term: {
                  'synthetics.step.index': Number(stepIndex),
                },
              },
              {
                term: {
                  config_id: monitorId,
                },
              },
              {
                range: {
                  '@timestamp': {
                    lte: 'now',
                    gte: 'now-24h/h',
                  },
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
    [monitorId, checkGroupId, stepIndex],
    {
      name: 'previousStepMetricsFromNetworkInfos',
    }
  );

  const metrics = data?.aggregations;

  const transferSize: number[] = [];
  transferData?.aggregations?.testRuns.buckets.forEach((bucket) => {
    transferSize.push(bucket.transferSize.value ?? 0);
  });

  return {
    loading,
    metrics: [
      {
        label: STEP_DURATION_LABEL,
        value: metrics?.totalDuration.value,
      },
      {
        value: metrics?.lcp.value,
        label: LCP_LABEL,
      },
      {
        value: metrics?.fcp.value,
        label: FCP_LABEL,
      },
      {
        value: metrics?.cls.value,
        label: CLS_LABEL,
        helpText: CLS_HELP_LABEL,
      },
      {
        value: metrics?.dcl.value,
        label: DCL_LABEL,
      },
      {
        value: median(transferSize),
        label: TRANSFER_SIZE,
      },
    ],
  };
};
