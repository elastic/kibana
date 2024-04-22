/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useParams } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import { useReduxEsSearch } from '../../../hooks/use_redux_es_search';
import { formatBytes } from './use_object_metrics';
import { formatMillisecond } from '../step_metrics/step_metrics';
import {
  CLS_HELP_LABEL,
  DCL_TOOLTIP,
  FCP_TOOLTIP,
  LCP_HELP_LABEL,
  TRANSFER_SIZE_HELP,
} from '../step_metrics/labels';
import { SYNTHETICS_INDEX_PATTERN } from '../../../../../../common/constants';
import { JourneyStep } from '../../../../../../common/runtime_types';

export const MONITOR_DURATION_US = 'monitor.duration.us';
export const SYNTHETICS_CLS = 'browser.experience.cls';
export const SYNTHETICS_LCP = 'browser.experience.lcp.us';
export const SYNTHETICS_FCP = 'browser.experience.fcp.us';
export const SYNTHETICS_ONLOAD_EVENT = 'browser.experience.load.us';
export const SYNTHETICS_DCL = 'browser.experience.dcl.us';
export const SYNTHETICS_STEP_NAME = 'synthetics.step.name.keyword';
export const SYNTHETICS_STEP_DURATION = 'synthetics.step.duration.us';

export type StepMetrics = ReturnType<typeof useStepMetrics>;

export const useStepMetrics = (step?: JourneyStep) => {
  const urlParams = useParams<{ checkGroupId: string; stepIndex: string }>();
  const checkGroupId = step?.monitor.check_group ?? urlParams.checkGroupId;
  const stepIndex = step?.synthetics.step?.index ?? urlParams.stepIndex;

  const { data } = useReduxEsSearch(
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
                  'monitor.check_group': checkGroupId,
                },
              },
              {
                term: {
                  'synthetics.step.index': Number(stepIndex),
                },
              },
            ],
          },
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
          totalDuration: {
            sum: {
              field: SYNTHETICS_STEP_DURATION,
            },
          },
        },
      },
    },
    [],
    { name: `stepMetrics/${checkGroupId}/${stepIndex}` }
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
                  'monitor.check_group': checkGroupId,
                },
              },
              {
                term: {
                  'synthetics.step.index': Number(stepIndex),
                },
              },
            ],
          },
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
    [],
    {
      name: `stepMetricsFromNetworkInfos/${checkGroupId}/${stepIndex}`,
    }
  );

  const metrics = data?.aggregations;
  const transferDataVal = transferData?.aggregations?.transferSize?.value ?? 0;

  return {
    metrics: [
      {
        label: STEP_DURATION_LABEL,
        value: metrics?.totalDuration.value,
        formatted: formatMillisecond((metrics?.totalDuration.value ?? 0) / 1000),
      },
      {
        value: metrics?.lcp.value,
        label: LCP_LABEL,
        helpText: LCP_HELP_LABEL,
        formatted: formatMillisecond((metrics?.lcp.value ?? 0) / 1000),
      },
      {
        value: metrics?.fcp.value,
        label: FCP_LABEL,
        helpText: FCP_TOOLTIP,
        formatted: formatMillisecond((metrics?.fcp.value ?? 0) / 1000),
      },
      {
        value: metrics?.cls.value,
        label: CLS_LABEL,
        helpText: CLS_HELP_LABEL,
        formatted: metrics?.cls.value ?? 0,
      },
      {
        value: metrics?.dcl.value,
        label: DCL_LABEL,
        helpText: DCL_TOOLTIP,
        formatted: formatMillisecond((metrics?.dcl.value ?? 0) / 1000),
      },
      {
        value: transferDataVal,
        label: TRANSFER_SIZE,
        helpText: TRANSFER_SIZE_HELP,
        formatted: formatBytes(transferDataVal ?? 0),
      },
    ],
  };
};

export const LCP_LABEL = i18n.translate('xpack.synthetics.lcp.label', {
  defaultMessage: 'LCP',
});

export const FCP_LABEL = i18n.translate('xpack.synthetics.fcp.label', {
  defaultMessage: 'FCP',
});

export const CLS_LABEL = i18n.translate('xpack.synthetics.cls.label', {
  defaultMessage: 'CLS',
});

export const DCL_LABEL = i18n.translate('xpack.synthetics.dcl.label', {
  defaultMessage: 'DCL',
});

export const STEP_DURATION_LABEL = i18n.translate('xpack.synthetics.totalDuration.metrics', {
  defaultMessage: 'Step duration',
});

export const TRANSFER_SIZE = i18n.translate('xpack.synthetics.totalDuration.transferSize', {
  defaultMessage: 'Transfer size',
});
