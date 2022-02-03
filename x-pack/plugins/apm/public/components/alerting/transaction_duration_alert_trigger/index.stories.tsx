/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Story } from '@storybook/react';
import React, { ComponentType, useState } from 'react';
import { RuleParams, TransactionDurationAlertTrigger } from '.';
import { CoreStart } from '../../../../../../../src/core/public';
import { createKibanaReactContext } from '../../../../../../../src/plugins/kibana_react/public';

const KibanaReactContext = createKibanaReactContext({
  notifications: { toasts: { add: () => {} } },
} as unknown as Partial<CoreStart>);

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
  const [params, setParams] = useState<RuleParams>({
    aggregationType: 'avg' as const,
    environment: 'testEnvironment',
    serviceName: 'testServiceName',
    threshold: 1500,
    transactionType: 'testTransactionType',
    windowSize: 5,
    windowUnit: 'm',
  });

  function setRuleParams(property: string, value: any) {
    setParams({ ...params, [property]: value });
  }

  return (
    <TransactionDurationAlertTrigger
      ruleParams={params}
      setRuleParams={setRuleParams}
      setRuleProperty={() => {}}
    />
  );
};
