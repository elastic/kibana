/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEsSearch } from '@kbn/observability-plugin/public';
import { useStepFilters } from './use_network_timings';

export const MONITOR_DURATION_US = 'monitor.duration.us';
export const SYNTHETICS_CLS = 'browser.experience.cls';
export const SYNTHETICS_LCP = 'browser.experience.lcp.us';
export const SYNTHETICS_FCP = 'browser.experience.fcp.us';
export const SYNTHETICS_DOCUMENT_ONLOAD = 'browser.experience.load.us';
export const SYNTHETICS_DCL = 'browser.experience.dcl.us';
export const SYNTHETICS_STEP_NAME = 'synthetics.step.name.keyword';
export const SYNTHETICS_STEP_DURATION = 'synthetics.step.duration.us';

export type StepMetrics = ReturnType<typeof useStepMetrics>;

export const useStepMetrics = (loadData = true, prevCheckGroupId?: string) => {
  const esIndex = loadData ? 'synthetics-*' : '';

  const { data } = useEsSearch(
    {
      index: esIndex,
      body: {
        size: 0,
        query: {
          bool: {
            filter: [
              {
                term: {
                  'synthetics.type': 'step/metrics',
                },
              },
              ...useStepFilters(prevCheckGroupId),
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
        },
      },
    },
    [esIndex],
    { name: 'networkTimings' }
  );

  const { data: transferData } = useEsSearch(
    {
      index: esIndex,
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
              ...useStepFilters(prevCheckGroupId),
            ],
          },
        },
        aggs: {
          transferSize: {
            sum: {
              field: 'synthetics.payload.transfer_size',
            },
          },
          resourceSize: {
            sum: {
              field: 'synthetics.payload.resource_size',
            },
          },
        },
      },
    },
    [esIndex],
    { name: 'networkTimings' }
  );

  return {
    ...(data?.aggregations ?? {}),
    transferData: ((transferData?.aggregations?.transferSize?.value ?? 0) / 1e6).toFixed(0),
    resourceSize: ((transferData?.aggregations?.resourceSize?.value ?? 0) / 1e6).toFixed(0),
  };
};
