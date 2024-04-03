/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Meta, Story } from '@storybook/react';
import React, { useState } from 'react';
import { CoreStart } from '@kbn/core/public';
import { createKibanaReactContext } from '@kbn/kibana-react-plugin/public';
import { TIME_UNITS } from '@kbn/triggers-actions-ui-plugin/public';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { ErrorCountRuleParams, ErrorCountRuleType } from '.';
import { ENVIRONMENT_ALL } from '../../../../../common/environment_filter_values';
import { createCallApmApi } from '../../../../services/rest/create_call_apm_api';
import { AlertMetadata } from '../../utils/helper';

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

export const CreatingInApmFromInventory: Story<Args> = ({
  ruleParams,
  metadata,
}) => {
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
CreatingInApmFromInventory.args = {
  ruleParams: {},
  metadata: {
    end: '2021-09-10T14:14:04.789Z',
    environment: ENVIRONMENT_ALL.value,
    serviceName: undefined,
    start: '2021-09-10T13:59:00.000Z',
  },
};

export const CreatingInApmFromService: Story<Args> = ({
  ruleParams,
  metadata,
}) => {
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
CreatingInApmFromService.args = {
  ruleParams: {},
  metadata: {
    end: '2021-09-10T14:14:04.789Z',
    environment: 'testEnvironment',
    serviceName: 'testServiceName',
    start: '2021-09-10T13:59:00.000Z',
  },
};

export const EditingInStackManagement: Story<Args> = ({
  ruleParams,
  metadata,
}) => {
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
EditingInStackManagement.args = {
  ruleParams: {
    environment: 'testEnvironment',
    serviceName: 'testServiceName',
    threshold: 25,
    windowSize: 1,
    windowUnit: TIME_UNITS.MINUTE,
  },
  metadata: undefined,
};

export const CreatingInStackManagement: Story<Args> = ({
  ruleParams,
  metadata,
}) => {
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
CreatingInStackManagement.args = {
  ruleParams: {},
  metadata: undefined,
};
