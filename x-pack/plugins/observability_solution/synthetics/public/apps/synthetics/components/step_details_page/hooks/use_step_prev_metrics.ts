/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useParams } from 'react-router-dom';
import { formatBytes } from './use_object_metrics';
import { formatMillisecond } from '../step_metrics/step_metrics';
import {
  CLS_LABEL,
  DCL_LABEL,
  FCP_LABEL,
  LCP_LABEL,
  STEP_DURATION_LABEL,
  TRANSFER_SIZE,
} from './use_step_metrics';
import { JourneyStep } from '../../../../../../common/runtime_types';
import { median } from './use_network_timings_prev';
import { SYNTHETICS_INDEX_PATTERN } from '../../../../../../common/constants';
import { useReduxEsSearch } from '../../../hooks/use_redux_es_search';

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

  const { data, loading } = useReduxEsSearch(
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
          testRuns: {
            terms: {
              field: 'monitor.check_group',
              size: 10000,
            },
            aggs: {
              fcp: {
                sum: {
                  field: SYNTHETICS_FCP,
                },
              },
              lcp: {
                sum: {
                  field: SYNTHETICS_LCP,
                },
              },
              cls: {
                sum: {
                  field: SYNTHETICS_CLS,
                },
              },
              dcl: {
                sum: {
                  field: SYNTHETICS_DCL,
                },
              },
              stepDuration: {
                sum: {
                  field: SYNTHETICS_STEP_DURATION,
                },
              },
            },
          },
        },
      },
    },
    [],
    { name: `previousStepMetrics/${monitorId}/${checkGroupId}/${stepIndex}` }
  );
  const { data: transferData } = useReduxEsSearch(
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
    [],
    {
      name: `previousStepMetricsFromNetworkInfos/${monitorId}/${checkGroupId}/${stepIndex}`,
    }
  );

  const metrics = data?.aggregations;

  const transferSize: number[] = [];
  transferData?.aggregations?.testRuns.buckets.forEach((bucket) => {
    transferSize.push(bucket.transferSize.value ?? 0);
  });

  const medianTransferSize = median(transferSize);

  const lcp: number[] = [];
  const fcp: number[] = [];
  const cls: number[] = [];
  const dcl: number[] = [];
  const stepDuration: number[] = [];

  metrics?.testRuns.buckets.forEach((bucket) => {
    lcp.push(bucket.lcp.value ?? 0);
    fcp.push(bucket.fcp.value ?? 0);
    cls.push(bucket.cls.value ?? 0);
    dcl.push(bucket.dcl.value ?? 0);
    stepDuration.push(bucket.stepDuration.value ?? 0);
  });

  const medianLcp = median(lcp);
  const medianFcp = median(fcp);
  const medianCls = median(cls);
  const medianDcl = median(dcl);
  const medianStepDuration = median(stepDuration);

  return {
    loading: loading && !metrics,
    metrics: [
      {
        label: STEP_DURATION_LABEL,
        value: medianStepDuration,
        formatted: formatMillisecond(medianStepDuration / 1000),
      },
      {
        value: medianLcp,
        label: LCP_LABEL,
        formatted: formatMillisecond(medianLcp / 1000),
      },
      {
        value: medianFcp,
        label: FCP_LABEL,
        formatted: formatMillisecond(medianFcp / 1000),
      },
      {
        value: medianCls,
        label: CLS_LABEL,
        formatted: medianCls,
      },
      {
        value: medianDcl,
        label: DCL_LABEL,
        formatted: formatMillisecond(medianDcl / 1000),
      },
      {
        value: medianTransferSize,
        label: TRANSFER_SIZE,
        formatted: formatBytes(medianTransferSize),
      },
    ],
  };
};
