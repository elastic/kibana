/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Meta, Story } from '@storybook/react';
import React, { useState } from 'react';
import { AlertParams, ErrorCountAlertTrigger } from '.';
import { CoreStart } from '../../../../../../../src/core/public';
import { createKibanaReactContext } from '../../../../../../../src/plugins/kibana_react/public';
import { ENVIRONMENT_ALL } from '../../../../common/environment_filter_values';
import { AlertMetadata } from '../helper';

const KibanaReactContext = createKibanaReactContext({
  notifications: { toasts: { add: () => {} } },
} as unknown as Partial<CoreStart>);

interface Args {
  alertParams: AlertParams;
  metadata?: AlertMetadata;
}

const stories: Meta<{}> = {
  title: 'alerting/ErrorCountAlertTrigger',
  component: ErrorCountAlertTrigger,
  decorators: [
    (StoryComponent) => {
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
export default stories;

export const CreatingInApmFromInventory: Story<Args> = ({
  alertParams,
  metadata,
}) => {
  const [params, setParams] = useState<AlertParams>(alertParams);

  function setAlertParams(property: string, value: any) {
    setParams({ ...params, [property]: value });
  }

  return (
    <ErrorCountAlertTrigger
      alertParams={params}
      metadata={metadata}
      setAlertParams={setAlertParams}
      setAlertProperty={() => {}}
    />
  );
};
CreatingInApmFromInventory.args = {
  alertParams: {},
  metadata: {
    end: '2021-09-10T14:14:04.789Z',
    environment: ENVIRONMENT_ALL.value,
    serviceName: undefined,
    start: '2021-09-10T13:59:00.000Z',
  },
};

export const CreatingInApmFromService: Story<Args> = ({
  alertParams,
  metadata,
}) => {
  const [params, setParams] = useState<AlertParams>(alertParams);

  function setAlertParams(property: string, value: any) {
    setParams({ ...params, [property]: value });
  }

  return (
    <ErrorCountAlertTrigger
      alertParams={params}
      metadata={metadata}
      setAlertParams={setAlertParams}
      setAlertProperty={() => {}}
    />
  );
};
CreatingInApmFromService.args = {
  alertParams: {},
  metadata: {
    end: '2021-09-10T14:14:04.789Z',
    environment: 'testEnvironment',
    serviceName: 'testServiceName',
    start: '2021-09-10T13:59:00.000Z',
  },
};

export const EditingInStackManagement: Story<Args> = ({
  alertParams,
  metadata,
}) => {
  const [params, setParams] = useState<AlertParams>(alertParams);

  function setAlertParams(property: string, value: any) {
    setParams({ ...params, [property]: value });
  }

  return (
    <ErrorCountAlertTrigger
      alertParams={params}
      metadata={metadata}
      setAlertParams={setAlertParams}
      setAlertProperty={() => {}}
    />
  );
};
EditingInStackManagement.args = {
  alertParams: {
    environment: 'testEnvironment',
    serviceName: 'testServiceName',
    threshold: 25,
    windowSize: 1,
    windowUnit: 'm',
  },
  metadata: undefined,
};

export const CreatingInStackManagement: Story<Args> = ({
  alertParams,
  metadata,
}) => {
  const [params, setParams] = useState<AlertParams>(alertParams);

  function setAlertParams(property: string, value: any) {
    setParams({ ...params, [property]: value });
  }

  return (
    <ErrorCountAlertTrigger
      alertParams={params}
      metadata={metadata}
      setAlertParams={setAlertParams}
      setAlertProperty={() => {}}
    />
  );
};
CreatingInStackManagement.args = {
  alertParams: {},
  metadata: undefined,
};
