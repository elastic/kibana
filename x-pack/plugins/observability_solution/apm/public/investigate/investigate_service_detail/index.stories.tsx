/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { StoryObj } from '@storybook/react';
import moment from 'moment';
import React from 'react';
import type { RequiredKeys } from 'utility-types';
import { coreMock } from '@kbn/core/public/mocks';
import { InvestigateServiceDetailBase as Component } from '.';
import { mockApmApiCallResponse } from '../../services/rest/call_apm_api_spy';
import { InvestigateContextProvider } from '../investigate_context_provider';
import { LatencyAggregationType } from '../../../common/latency_aggregation_types';
import latencyChartResponse from '../../components/shared/charts/latency_chart/latency_chart_response.json';
import { ApmDocumentType } from '../../../common/document_type';
import { RollupInterval } from '../../../common/rollup';
import { FETCH_STATUS } from '../../hooks/use_fetcher';

export default {
  title: 'widgets/InvestigateServiceDetail',
  component: Component,
};

type ComponentProps = React.ComponentProps<typeof Component>;

const defaultProps: ComponentProps = {
  serviceName: 'opbeans-java',
  start: moment().subtract(15, 'minutes').toISOString(),
  end: moment().toISOString(),
  environment: 'ENVIRONMENT_ALL' as const,
  transactionTypes: ['request'],
  selectedTransactionType: 'request',
  latencyAggregationType: LatencyAggregationType.avg,
  kuery: '',
  onTransactionTypeChange: () => {},
  preferred: {
    bucketSizeInSeconds: 60,
    source: {
      documentType: ApmDocumentType.ServiceTransactionMetric,
      hasDocs: true,
      hasDurationSummaryField: true,
      rollupInterval: RollupInterval.OneMinute,
    },
  },
  transactionTypeStatus: FETCH_STATUS.SUCCESS,
};

type RequiredProps = Pick<
  ComponentProps,
  Exclude<RequiredKeys<ComponentProps>, RequiredKeys<typeof defaultProps>>
>;

const coreSetup = coreMock.createSetup({
  pluginStartDeps: {},
});

mockApmApiCallResponse('GET /internal/apm/services/{serviceName}/metadata/icons', () => ({
  agentName: 'java',
  cloudProvider: 'google',
}));

mockApmApiCallResponse('GET /internal/apm/services/{serviceName}/metadata/details', () => ({
  service: {
    agent: {
      name: 'java',
      version: '1.0',
    },
  },
}));

mockApmApiCallResponse(
  'GET /internal/apm/services/{serviceName}/transactions/charts/latency',
  () => latencyChartResponse
);

mockApmApiCallResponse('GET /internal/apm/services/{serviceName}/throughput', () => ({
  currentPeriod: [],
  previousPeriod: [],
}));

mockApmApiCallResponse('GET /api/apm/services/{serviceName}/annotation/search 2023-10-31', () => ({
  annotations: [],
}));

mockApmApiCallResponse('GET /internal/apm/time_range_metadata', () => ({
  isUsingServiceDestinationMetrics: false,
  sources: [],
}));

function createStory<T extends Partial<ComponentProps> & RequiredProps>(props: T) {
  const story: StoryObj<ComponentProps> = {
    args: props,
    render: (allArgs) => {
      const allProps = {
        ...defaultProps,
        ...props,
      };

      return (
        <div style={{ width: 800, height: 600 }}>
          <InvestigateContextProvider
            coreSetup={coreSetup}
            timeRange={{
              from: allProps.start,
              to: allProps.end,
            }}
            query={{ query: '', language: 'kuery' }}
            filters={[]}
          >
            <Component {...{ ...defaultProps, ...allArgs }} />
          </InvestigateContextProvider>
        </div>
      );
    },
  };
  return story;
}

export const empty = createStory({});
