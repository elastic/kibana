/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StoryObj } from '@storybook/react';
import type { ComponentType } from 'react';
import React, { useState } from 'react';
import type { CoreStart } from '@kbn/core/public';
import { createKibanaReactContext } from '@kbn/kibana-react-plugin/public';
import type { ErrorRateRuleParams } from '.';
import { TransactionErrorRateRuleType } from '.';
import type { AlertMetadata } from '../../utils/helper';
import { ENVIRONMENT_ALL } from '../../../../../common/environment_filter_values';

const KibanaReactContext = createKibanaReactContext({
  notifications: { toasts: { add: () => {} } },
} as unknown as Partial<CoreStart>);

interface Args {
  ruleParams: ErrorRateRuleParams;
  metadata?: AlertMetadata;
}

export default {
  title: 'alerting/TransactionErrorRateRuleType',
  component: TransactionErrorRateRuleType,
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

const CreatingInApmServiceOverviewComponent = ({ ruleParams, metadata }: Args) => {
  const [params, setParams] = useState<ErrorRateRuleParams>(ruleParams);

  function setRuleParams(property: string, value: any) {
    setParams({ ...params, [property]: value });
  }

  return (
    <TransactionErrorRateRuleType
      ruleParams={params}
      metadata={metadata}
      setRuleParams={setRuleParams}
      setRuleProperty={() => {}}
    />
  );
};

export const CreatingInApmServiceOverview: StoryObj<Args> = {
  render: ({ ruleParams, metadata }) => (
    <CreatingInApmServiceOverviewComponent ruleParams={ruleParams} metadata={metadata} />
  ),

  args: {
    ruleParams: {
      environment: 'testEnvironment',
      serviceName: 'testServiceName',
      threshold: 1500,
      transactionType: 'testTransactionType',
      transactionName: 'GET /api/customer/:id',
      windowSize: 5,
      windowUnit: 'm',
    },
    metadata: {
      environment: ENVIRONMENT_ALL.value,
      serviceName: undefined,
    },
  },
};

const CreatingInStackManagementComponent = ({ ruleParams, metadata }: Args) => {
  const [params, setParams] = useState<ErrorRateRuleParams>(ruleParams);

  function setRuleParams(property: string, value: any) {
    setParams({ ...params, [property]: value });
  }

  return (
    <TransactionErrorRateRuleType
      ruleParams={params}
      metadata={metadata}
      setRuleParams={setRuleParams}
      setRuleProperty={() => {}}
    />
  );
};

export const CreatingInStackManagement: StoryObj<Args> = {
  render: ({ ruleParams, metadata }) => (
    <CreatingInStackManagementComponent ruleParams={ruleParams} metadata={metadata} />
  ),

  args: {
    ruleParams: {
      environment: 'testEnvironment',
      threshold: 1500,
      windowSize: 5,
      windowUnit: 'm',
    },
    metadata: undefined,
  },
};
