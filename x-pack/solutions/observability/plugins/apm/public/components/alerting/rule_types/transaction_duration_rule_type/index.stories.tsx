/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StoryObj } from '@storybook/react';
import type { ComponentType } from 'react';
import React, { useState } from 'react';
import { MockApmPluginStorybook } from '../../../../context/apm_plugin/mock_apm_plugin_storybook';
import type { TransactionDurationRuleParams } from '.';
import { TransactionDurationRuleType } from '.';
import { AggregationType } from '../../../../../common/rules/apm_rule_types';
import type { AlertMetadata } from '../../utils/helper';
import { ENVIRONMENT_ALL } from '../../../../../common/environment_filter_values';

interface Args {
  ruleParams: TransactionDurationRuleParams;
  metadata?: AlertMetadata;
}

export default {
  title: 'alerting/TransactionDurationRuleType',
  component: TransactionDurationRuleType,
  decorators: [
    (StoryComponent: ComponentType) => {
      return (
        <MockApmPluginStorybook>
          <div style={{ width: 400 }}>
            <StoryComponent />
          </div>
        </MockApmPluginStorybook>
      );
    },
  ],
};

const CreatingInApmServiceOverviewComponent = ({ ruleParams, metadata }: Args) => {
  const [params, setParams] = useState<TransactionDurationRuleParams>(ruleParams);

  function setRuleParams(property: string, value: any) {
    setParams({ ...params, [property]: value });
  }

  return (
    <TransactionDurationRuleType
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
      aggregationType: AggregationType.Avg,
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
  const [params, setParams] = useState<TransactionDurationRuleParams>(ruleParams);

  function setRuleParams(property: string, value: any) {
    setParams({ ...params, [property]: value });
  }

  return (
    <TransactionDurationRuleType
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
      aggregationType: AggregationType.Avg,
      environment: 'testEnvironment',
      threshold: 1500,
      windowSize: 5,
      windowUnit: 'm',
    },
    metadata: undefined,
  },
};
