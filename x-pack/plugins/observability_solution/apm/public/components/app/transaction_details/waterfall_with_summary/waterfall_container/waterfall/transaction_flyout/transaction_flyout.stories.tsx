/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { apm, dedot } from '@kbn/apm-synthtrace-client';
import { Story } from '@storybook/react';
import React, { ComponentProps, ComponentType } from 'react';
import { TransactionFlyout } from '.';
import { Transaction } from '../../../../../../../../typings/es_schemas/ui/transaction';
import { ApmPluginContextValue } from '../../../../../../../context/apm_plugin/apm_plugin_context';
import { MockApmPluginStorybook } from '../../../../../../../context/apm_plugin/mock_apm_plugin_storybook';
import { APIReturnType } from '../../../../../../../services/rest/create_call_apm_api';

type Args = ComponentProps<typeof TransactionFlyout>;
type TransactionDetailsApiReturnType =
  APIReturnType<'GET /internal/apm/traces/{traceId}/transactions/{transactionId}'>;

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
      instanceJava.error({ message: '[ResponseError] index_not_found_exception' }).timestamp(50)
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
  return { events, transactionEvent: events[0] };
}

const data = generateData();

export default {
  title: 'app/TransactionDetails/waterfall/TransactionFlyout',
  component: TransactionFlyout,
  decorators: [
    (StoryComponent: ComponentType) => {
      const coreMock = {
        http: {
          get: async (): Promise<TransactionDetailsApiReturnType> => {
            return dedot(data.transactionEvent, {}) as Transaction;
          },
        },
      };
      return (
        <MockApmPluginStorybook
          apmContext={{ core: coreMock } as unknown as ApmPluginContextValue}
          routePath="/services/testServiceName/transactions/view?rangeFrom=now-15m&rangeTo=now&transactionName=Api::CustomersController%23index&transactionType=request&latencyAggregationType=avg&flyoutDetailTab=&waterfallItemId=0863ecffc80f0aed&traceId=1d63e25e7345627176e172ae690f9462&transactionId=969fe48e33f4e13c"
        >
          <StoryComponent />
        </MockApmPluginStorybook>
      );
    },
  ],
};

export const Example: Story<Args> = () => {
  return (
    <TransactionFlyout
      onClose={() => {}}
      transactionId={data.transactionEvent['transaction.id']!}
      traceId={data.transactionEvent['trace.id']!}
      spanLinksCount={{ linkedChildren: 0, linkedParents: 0 }}
      start="fake-time"
      end="fake-time"
    />
  );
};
