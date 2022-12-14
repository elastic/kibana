/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { apm, dedot } from '@kbn/apm-synthtrace';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { Meta, Story } from '@storybook/react';
import { noop } from 'lodash';
import React, { ComponentProps } from 'react';
import { WaterfallContainer } from '.';
import {
  WaterfallError,
  WaterfallSpan,
  WaterfallTransaction,
} from '../../../../../../common/waterfall/typings';
import { Transaction } from '../../../../../../typings/es_schemas/ui/transaction';
import { getWaterfall } from './waterfall/waterfall_helpers/waterfall_helpers';
import { MockApmPluginStorybook } from '../../../../../context/apm_plugin/mock_apm_plugin_storybook';

type Args = ComponentProps<typeof WaterfallContainer>;

const stories: Meta<Args> = {
  title: 'app/TransactionDetails/waterfall',
  component: WaterfallContainer,
  decorators: [
    (StoryComponent) => (
      <MockApmPluginStorybook routePath="/services/{serviceName}/transactions/view?rangeFrom=now-15m&rangeTo=now&transactionName=testTransactionName">
        <StoryComponent />
      </MockApmPluginStorybook>
    ),
  ],
};
export default stories;

export const Example: Story<any> = () => {
  const serviceName = 'synth-apple';
  const instanceJava = apm
    .service({
      name: serviceName,
      environment: 'production',
      agentName: 'java',
    })
    .instance('instance-b');
  const events = instanceJava
    .transaction({ transactionName: 'GET /apple 🍏' })
    .timestamp(1)
    .duration(1000)
    .failure()
    .errors(
      instanceJava
        .error({ message: '[ResponseError] index_not_found_exception' })
        .timestamp(50)
    )
    .children(
      instanceJava
        .span({
          spanName: 'get_green_apple_🍏',
          spanType: 'db',
          spanSubtype: 'elasticsearch',
        })
        .timestamp(50)
        .duration(900)
        .success()
    )
    .serialize();

  // Only one error is created in the above scenario
  const errorEventId = events.findIndex((doc) => {
    return doc['processor.event'] === ProcessorEvent.error;
  });

  const errorDocs = events.splice(errorEventId, 1);

  const traceDocs = events.map(
    (event) => dedot(event, {}) as WaterfallTransaction | WaterfallSpan
  );
  const traceItems = {
    exceedsMax: false,
    traceDocs,
    errorDocs: errorDocs.map((error) => dedot(error, {}) as WaterfallError),
    spanLinksCountById: {},
  };

  const entryTransaction = dedot(traceDocs[0]!, {}) as Transaction;
  const waterfall = getWaterfall({ traceItems, entryTransaction });

  return (
    <WaterfallContainer
      serviceName={serviceName}
      waterfall={waterfall}
      showCriticalPath={false}
      onShowCriticalPathChange={noop}
    />
  );
};
