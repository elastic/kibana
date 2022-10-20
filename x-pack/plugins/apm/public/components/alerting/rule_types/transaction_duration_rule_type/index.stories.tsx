/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Story } from '@storybook/react';
import React, { ComponentType, useState } from 'react';
import { CoreStart } from '@kbn/core/public';
import { createKibanaReactContext } from '@kbn/kibana-react-plugin/public';
import { RuleParams, TransactionDurationRuleType } from '.';
import { AggregationType } from '../../../../../common/rules/apm_rule_types';

const KibanaReactContext = createKibanaReactContext({
  notifications: { toasts: { add: () => {} } },
} as unknown as Partial<CoreStart>);

export default {
  title: 'alerting/TransactionDurationRuleType',
  component: TransactionDurationRuleType,
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
    aggregationType: AggregationType.Avg,
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
    <TransactionDurationRuleType
      ruleParams={params}
      setRuleParams={setRuleParams}
      setRuleProperty={() => {}}
    />
  );
};
