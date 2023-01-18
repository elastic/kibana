/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useParams } from 'react-router-dom';
import { useReduxEsSearch } from '../../../hooks/use_redux_es_search';
import { SYNTHETICS_INDEX_PATTERN } from '../../../../../../common/constants';

export const MONITOR_DURATION_US = 'monitor.duration.us';
export const SYNTHETICS_CLS = 'browser.experience.cls';
export const SYNTHETICS_LCP = 'browser.experience.lcp.us';
export const SYNTHETICS_FCP = 'browser.experience.fcp.us';
export const SYNTHETICS_ONLOAD_EVENT = 'browser.experience.load.us';
export const SYNTHETICS_DCL = 'browser.experience.dcl.us';
export const SYNTHETICS_STEP_NAME = 'synthetics.step.name.keyword';
export const SYNTHETICS_STEP_DURATION = 'synthetics.step.duration.us';

export type PreviousObjectMetrics = ReturnType<typeof usePreviousObjectMetrics>;

export const usePreviousObjectMetrics = () => {
  const { monitorId, stepIndex, checkGroupId } = useParams<{
    monitorId: string;
    stepIndex: string;
    checkGroupId: string;
  }>();

  const { data: prevObjectMetrics } = useReduxEsSearch(
    {
      index: SYNTHETICS_INDEX_PATTERN,
      body: {
        track_total_hits: false,
        sort: [
          {
            '@timestamp': {
              order: 'desc',
            },
          },
        ],
        size: 0,
        runtime_mappings: {
          'synthetics.payload.transfer_size': {
            type: 'long',
          },
        },
        query: {
          bool: {
            filter: [
              {
                term: {
                  config_id: monitorId,
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
                range: {
                  '@timestamp': {
                    gte: 'now-24h/h',
                    lte: 'now',
                  },
                },
              },
            ],
            must_not: [
              {
                term: {
                  'monitor.check_group': {
                    value: checkGroupId,
                  },
                },
              },
            ],
          },
        },
        aggs: {
          testRuns: {
            cardinality: {
              field: 'monitor.check_group',
            },
          },
          objectCounts: {
            terms: {
              field: 'http.response.mime_type',
              size: 500,
            },
            aggs: {
              weight: {
                sum: {
                  field: 'synthetics.payload.transfer_size',
                },
              },
            },
          },
        },
      },
    },
    [stepIndex, monitorId, checkGroupId],
    {
      name: 'previousObjectMetrics',
    }
  );

  const mimeData: Record<string, { weight: number; count: number }> = {};

  const testRuns = prevObjectMetrics?.aggregations?.testRuns?.value ?? 0;

  prevObjectMetrics?.aggregations?.objectCounts?.buckets?.forEach((bucket) => {
    mimeData[bucket.key] = {
      weight: bucket.weight.value ? bucket.weight.value / testRuns : 0,
      count: bucket.doc_count / testRuns,
    };
  });

  return { mimeData };
};
