/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useParams } from 'react-router-dom';
import { useEsSearch } from '@kbn/observability-plugin/public';
import { formatBytes } from './use_object_metrics';
import { formatMillisecond } from '../step_metrics/step_metrics';
import { SYNTHETICS_INDEX_PATTERN } from '../../../../../../common/constants';
import {
  CLS_LABEL,
  DCL_LABEL,
  FCP_LABEL,
  LCP_LABEL,
  STEP_DURATION_LABEL,
  TRANSFER_SIZE,
} from './use_step_metrics';
import { JourneyStep } from '../../../../../../common/runtime_types';

export const MONITOR_DURATION_US = 'monitor.duration.us';
export const SYNTHETICS_CLS = 'browser.experience.cls';
export const SYNTHETICS_LCP = 'browser.experience.lcp.us';
export const SYNTHETICS_FCP = 'browser.experience.fcp.us';
export const SYNTHETICS_DOCUMENT_ONLOAD = 'browser.experience.load.us';
export const SYNTHETICS_DCL = 'browser.experience.dcl.us';
export const SYNTHETICS_STEP_NAME = 'synthetics.step.name.keyword';
export const SYNTHETICS_STEP_DURATION = 'synthetics.step.duration.us';

export const useStepPrevMetrics = (step?: JourneyStep) => {
  const urlParams = useParams<{
    checkGroupId: string;
    stepIndex: string;
    monitorId: string;
  }>();

  const monitorId = urlParams.monitorId;
  const checkGroupId = step?.monitor.check_group ?? urlParams.checkGroupId;
  const stepIndex = step?.synthetics.step?.index ?? urlParams.stepIndex;

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
          transferSize: {
            avg: {
              field: 'synthetics.payload.transfer_size',
            },
          },
          resourceSize: {
            avg: {
              field: 'synthetics.payload.resource_size',
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
  const transferDataVal = transferData?.aggregations?.transferSize?.value ?? 0;

  return {
    loading,
    metrics: [
      {
        label: STEP_DURATION_LABEL,
        value: metrics?.totalDuration.value,
        formatted: formatMillisecond((metrics?.totalDuration.value ?? 0) / 1000),
      },
      {
        value: metrics?.lcp.value,
        label: LCP_LABEL,
        formatted: formatMillisecond((metrics?.lcp.value ?? 0) / 1000),
      },
      {
        value: metrics?.fcp.value,
        label: FCP_LABEL,
        formatted: formatMillisecond((metrics?.fcp.value ?? 0) / 1000),
      },
      {
        value: metrics?.cls.value,
        label: CLS_LABEL,
        formatted: formatMillisecond((metrics?.cls.value ?? 0) / 1000),
      },
      {
        value: metrics?.dcl.value,
        label: DCL_LABEL,
        formatted: formatMillisecond((metrics?.dcl.value ?? 0) / 1000),
      },
      {
        value: transferDataVal,
        label: TRANSFER_SIZE,
        formatted: formatBytes(transferDataVal ?? 0),
      },
    ],
  };
};
