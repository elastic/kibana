/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { apm } from '@kbn/apm-synthtrace';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { Story } from '@storybook/react';
import React, { ComponentProps, ComponentType } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { SpanFlyout } from '.';
import { MockApmPluginContextWrapper } from '../../../../../../../context/apm_plugin/mock_apm_plugin_context';

type Args = ComponentProps<typeof SpanFlyout>;

function generateData() {
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
  const spanEvent = events.find(
    (event) => event['processor.event'] === ProcessorEvent.span
  )!;

  const parentTransaction = events.find(
    (event) => event['transaction.id'] === spanEvent['parent.id']
  )!;
  return { events, spanEvent, parentTransaction };
}

const data = generateData();

export default {
  title: 'app/TransactionDetails/waterfall/SpanFlyout',
  component: SpanFlyout,
  decorators: [
    (StoryComponent: ComponentType) => {
      return (
        <MemoryRouter
          initialEntries={[
            '/services/testServiceName/transactions/view?rangeFrom=now-15m&rangeTo=now&transactionName=Api::CustomersController%23index&transactionType=request&latencyAggregationType=avg&flyoutDetailTab=&waterfallItemId=0863ecffc80f0aed&traceId=1d63e25e7345627176e172ae690f9462&transactionId=969fe48e33f4e13c',
          ]}
        >
          <MockApmPluginContextWrapper>
            <StoryComponent />
          </MockApmPluginContextWrapper>
        </MemoryRouter>
      );
    },
  ],
};

export const TransactionSpan: Story<Args> = () => {
  return (
    <SpanFlyout
      spanId={data.spanEvent['span.id']!}
      traceId={data.spanEvent['trace.id']!}
      spanLinksCount={{ linkedChildren: 0, linkedParents: 0 }}
      parentTransactionId={data.spanEvent['parent.id']}
      onClose={() => {}}
    />
  );
};
