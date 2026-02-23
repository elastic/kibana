/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { apm, dedot } from '@kbn/synthtrace-client';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import type { Meta, StoryFn } from '@storybook/react';
import { noop } from 'lodash';
import type { ComponentProps } from 'react';
import React from 'react';
import type {
  WaterfallSpan,
  WaterfallTransaction,
} from '../../../../../common/waterfall/typings';
import type { Transaction } from '../../../../../typings/es_schemas/ui/transaction';
import { MockApmPluginStorybook } from '../../../../context/apm_plugin/mock_apm_plugin_storybook';
import { FETCH_STATUS } from '../../../../hooks/use_fetcher';
import { WaterfallWithSummary } from '.';
import { getWaterfall } from './waterfall_container/waterfall/waterfall_helpers/waterfall_helpers';

type Args = ComponentProps<typeof WaterfallWithSummary>;

function generateData() {
  const serviceName = 'frontend';
  const instance = apm
    .service({ name: serviceName, environment: 'production', agentName: 'java' })
    .instance('instance-a');

  const events = instance
    .transaction({ transactionName: 'GET /api/products' })
    .timestamp(1)
    .duration(4000)
    .failure()
    .errors(instance.error({ message: 'HTTP 5xx' }).timestamp(50))
    .children(
      instance
        .span({ spanName: 'GET elasticsearch', spanType: 'db', spanSubtype: 'elasticsearch' })
        .timestamp(50)
        .duration(3000)
        .success()
    )
    .serialize();

  const errorIdx = events.findIndex((d) => d['processor.event'] === ProcessorEvent.error);
  events.splice(errorIdx, 1);

  const traceDocs = events
    .filter((e) => e['processor.event'] !== 'metric')
    .map((e) => dedot(e, {}) as WaterfallTransaction | WaterfallSpan);

  const traceItems = {
    exceedsMax: false,
    traceDocs,
    errorDocs: [],
    spanLinksCountById: {},
    traceDocsTotal: traceDocs.length,
    maxTraceItems: 5000,
  };

  const entryTransaction = dedot(traceDocs[0]!, {}) as Transaction;
  return { traceItems, entryTransaction };
}

const { traceItems, entryTransaction } = generateData();
const waterfall = getWaterfall({ traceItems, entryTransaction });

const traceSamples = [{ traceId: 'abc', transactionId: '123' }];

const stories: Meta<Args> = {
  title: 'app/TransactionDetails/WaterfallWithSummary',
  component: WaterfallWithSummary,
  decorators: [
    (StoryComponent) => (
      <MockApmPluginStorybook routePath="/services/{serviceName}/transactions/view?rangeFrom=now-15m&rangeTo=now&transactionName=GET+%2Fapi%2Fproducts">
        <StoryComponent />
      </MockApmPluginStorybook>
    ),
  ],
};
export default stories;

export const NarrowViewport: StoryFn<Args> = () => {
  return (
    <div style={{ width: 500 }}>
      <WaterfallWithSummary
        waterfallFetchResult={waterfall}
        traceSamples={traceSamples}
        traceSamplesFetchStatus={FETCH_STATUS.SUCCESS}
        waterfallFetchStatus={FETCH_STATUS.SUCCESS}
        environment="production"
        onSampleClick={noop}
        onTabClick={noop}
        serviceName="frontend"
        showCriticalPath={false}
        onShowCriticalPathChange={noop}
        rangeFrom="now-15m"
        rangeTo="now"
        traceId="abc"
      />
    </div>
  );
};

NarrowViewport.storyName = 'Narrow viewport (trace sample title wrapping fix)';
