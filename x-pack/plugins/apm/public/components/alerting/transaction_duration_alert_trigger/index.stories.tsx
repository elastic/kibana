/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Story } from '@storybook/react';
import type { ComponentType } from 'react';
import React, { useState } from 'react';
import type { AlertParams } from '.';
import { TransactionDurationAlertTrigger } from '.';
import type { CoreStart } from '../../../../../../../src/core/public';
import { createKibanaReactContext } from '../../../../../../../src/plugins/kibana_react/public';

const KibanaReactContext = createKibanaReactContext(({
  notifications: { toasts: { add: () => {} } },
} as unknown) as Partial<CoreStart>);

export default {
  title: 'alerting/TransactionDurationAlertTrigger',
  component: TransactionDurationAlertTrigger,
  decorators: [
    (StoryComponent: ComponentType) => {
      return (
        <KibanaReactContext.Provider>
          <div style={{ width: 400 }}>
            <StoryComponent />
          </div>
        </KibanaReactContext.Provider>
      );
    },
  ],
};

export const Example: Story = () => {
  const [params, setParams] = useState<AlertParams>({
    aggregationType: 'avg' as const,
    environment: 'testEnvironment',
    serviceName: 'testServiceName',
    threshold: 1500,
    transactionType: 'testTransactionType',
    windowSize: 5,
    windowUnit: 'm',
  });

  function setAlertParams(property: string, value: any) {
    setParams({ ...params, [property]: value });
  }

  return (
    <TransactionDurationAlertTrigger
      alertParams={params}
      setAlertParams={setAlertParams}
      setAlertProperty={() => {}}
    />
  );
};
