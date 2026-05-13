/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StoryObj, Meta } from '@storybook/react';
import React, { useState } from 'react';
import type { CoreStart } from '@kbn/core/public';
import { createKibanaReactContext } from '@kbn/kibana-react-plugin/public';
import { TIME_UNITS } from '@kbn/triggers-actions-ui-plugin/public';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import type { ErrorCountRuleParams } from '.';
import { ErrorCountRuleType } from '.';
import { ENVIRONMENT_ALL } from '../../../../../common/environment_filter_values';
import { createCallApmApi } from '../../../../services/rest/create_call_apm_api';
import type { AlertMetadata } from '../../utils/helper';

const coreMock = {
  http: { get: async () => ({}) },
  notifications: { toasts: { add: () => {} } },
  uiSettings: { get: () => {} },
} as unknown as CoreStart;

const KibanaReactContext = createKibanaReactContext({
  ...coreMock,
  dataViews: {
    create: async () => {},
  },
});

interface Args {
  ruleParams: ErrorCountRuleParams;
  metadata?: AlertMetadata;
}

const stories: Meta<{}> = {
  title: 'alerting/ErrorCountRuleType',
  component: ErrorCountRuleType,
  decorators: [
    (StoryComponent) => {
      createCallApmApi(coreMock);

      return (
        <IntlProvider locale="en">
          <KibanaReactContext.Provider>
            <div style={{ width: 400 }}>
              <StoryComponent />
            </div>
          </KibanaReactContext.Provider>
        </IntlProvider>
      );
    },
  ],
};
export default stories;

const CreatingInApmFromInventoryComponent = ({ ruleParams, metadata }: Args) => {
  const [params, setParams] = useState<ErrorCountRuleParams>(ruleParams);

  function setRuleParams(property: string, value: any) {
    setParams({ ...params, [property]: value });
  }

  return (
    <ErrorCountRuleType
      ruleParams={params}
      metadata={metadata}
      setRuleParams={setRuleParams}
      setRuleProperty={() => {}}
    />
  );
};

export const CreatingInApmFromInventory: StoryObj<Args> = {
  render: ({ ruleParams, metadata }) => (
    <CreatingInApmFromInventoryComponent ruleParams={ruleParams} metadata={metadata} />
  ),

  args: {
    ruleParams: {},
    metadata: {
      end: '2021-09-10T14:14:04.789Z',
      environment: ENVIRONMENT_ALL.value,
      serviceName: undefined,
      start: '2021-09-10T13:59:00.000Z',
    },
  },
};

const CreatingInApmFromServiceComponent = ({ ruleParams, metadata }: Args) => {
  const [params, setParams] = useState<ErrorCountRuleParams>(ruleParams);

  function setRuleParams(property: string, value: any) {
    setParams({ ...params, [property]: value });
  }

  return (
    <ErrorCountRuleType
      ruleParams={params}
      metadata={metadata}
      setRuleParams={setRuleParams}
      setRuleProperty={() => {}}
    />
  );
};

export const CreatingInApmFromService: StoryObj<Args> = {
  render: ({ ruleParams, metadata }) => (
    <CreatingInApmFromServiceComponent ruleParams={ruleParams} metadata={metadata} />
  ),

  args: {
    ruleParams: {},
    metadata: {
      end: '2021-09-10T14:14:04.789Z',
      environment: 'testEnvironment',
      serviceName: 'testServiceName',
      start: '2021-09-10T13:59:00.000Z',
    },
  },
};

const EditingInStackManagementComponent = ({ ruleParams, metadata }: Args) => {
  const [params, setParams] = useState<ErrorCountRuleParams>(ruleParams);

  function setRuleParams(property: string, value: any) {
    setParams({ ...params, [property]: value });
  }

  return (
    <ErrorCountRuleType
      ruleParams={params}
      metadata={metadata}
      setRuleParams={setRuleParams}
      setRuleProperty={() => {}}
    />
  );
};

export const EditingInStackManagement: StoryObj<Args> = {
  render: ({ ruleParams, metadata }) => (
    <EditingInStackManagementComponent ruleParams={ruleParams} metadata={metadata} />
  ),

  args: {
    ruleParams: {
      environment: 'testEnvironment',
      serviceName: 'testServiceName',
      threshold: 25,
      windowSize: 1,
      windowUnit: TIME_UNITS.MINUTE,
    },
    metadata: undefined,
  },
};

const CreatingInStackManagementComponent = ({ ruleParams, metadata }: Args) => {
  const [params, setParams] = useState<ErrorCountRuleParams>(ruleParams);

  function setRuleParams(property: string, value: any) {
    setParams({ ...params, [property]: value });
  }

  return (
    <ErrorCountRuleType
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
    ruleParams: {},
    metadata: undefined,
  },
};
