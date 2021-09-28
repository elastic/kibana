/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useSelector } from 'react-redux';
import { createEsParams, useEsSearch } from '../../../../../../observability/public';
import { selectDynamicSettings } from '../../../../state/selectors';
import { MarkerItems } from '../waterfall/context/waterfall_chart';

export interface Props {
  checkGroup: string;
  stepIndex: number;
  hasNavigationRequest?: boolean;
}
export const BROWSER_TRACE_TYPE = 'browser.relative_trace.type';
export const BROWSER_TRACE_NAME = 'browser.relative_trace.name';
export const BROWSER_TRACE_START = 'browser.relative_trace.start.us';

export const useStepWaterfallMetrics = ({ checkGroup, hasNavigationRequest, stepIndex }: Props) => {
  const { settings } = useSelector(selectDynamicSettings);

  const heartbeatIndices = settings?.heartbeatIndices || '';

  const { data, loading } = useEsSearch(
    hasNavigationRequest
      ? createEsParams({
          index: heartbeatIndices!,
          body: {
            query: {
              bool: {
                filter: [
                  {
                    term: {
                      'synthetics.step.index': stepIndex,
                    },
                  },
                  {
                    term: {
                      'monitor.check_group': checkGroup,
                    },
                  },
                  {
                    term: {
                      'synthetics.type': 'step/metrics',
                    },
                  },
                ],
              },
            },
            fields: ['browser.*'],
            _source: false,
          },
        })
      : {},
    [heartbeatIndices, checkGroup, hasNavigationRequest]
  );

  const metrics: MarkerItems = [];

  if (data && hasNavigationRequest) {
    const metricDocs = data.hits.hits as unknown as Array<{ fields: any }>;
    let navigationStart = 0;
    let navigationStartExist = false;

    metricDocs.forEach(({ fields }) => {
      if (fields[BROWSER_TRACE_TYPE]?.[0] === 'mark') {
        const { [BROWSER_TRACE_NAME]: metricType, [BROWSER_TRACE_START]: metricValue } = fields;
        if (metricType?.[0] === 'navigationStart') {
          navigationStart = metricValue?.[0];
          navigationStartExist = true;
        }
      }
    });

    if (navigationStartExist) {
      metricDocs.forEach(({ fields }) => {
        if (fields['browser.relative_trace.type']?.[0] === 'mark') {
          const {
            'browser.relative_trace.name': metricType,
            'browser.relative_trace.start.us': metricValue,
          } = fields;
          if (metricType?.[0] !== 'navigationStart') {
            metrics.push({
              id: metricType?.[0],
              offset: (metricValue?.[0] - navigationStart) / 1000,
            });
          }
        }
      });
    }
  }

  return { metrics, loading };
};
