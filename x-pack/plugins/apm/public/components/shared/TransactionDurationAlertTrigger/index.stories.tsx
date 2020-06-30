/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
// import { storiesOf } from '@storybook/react';
import { cloneDeep, merge } from 'lodash';
import React from 'react';
import { TransactionDurationAlertTrigger } from '.';
import { ApmPluginContextValue } from '../../../context/ApmPluginContext';
import {
  mockApmPluginContextValue,
  MockApmPluginContextWrapper,
} from '../../../context/ApmPluginContext/MockApmPluginContext';
import { MockUrlParamsContextProvider } from '../../../context/UrlParamsContext/MockUrlParamsContextProvider';

// Disabling this because we currently don't have a way to mock `useEnvironments`
// which is used by this component. Using the fetch-mock module should work, but
// our current storybook setup has core-js-related problems when trying to import
// it.
// storiesOf('app/TransactionDurationAlertTrigger', module).add('example',
// eslint-disable-next-line no-unused-expressions
() => {
  const params = {
    threshold: 1500,
    aggregationType: 'avg' as const,
    window: '5m',
  };

  const contextMock = (merge(cloneDeep(mockApmPluginContextValue), {
    core: {
      http: {
        get: () => {
          return Promise.resolve({ transactionTypes: ['request'] });
        },
      },
    },
  }) as unknown) as ApmPluginContextValue;

  return (
    <div style={{ width: 400 }}>
      <MockApmPluginContextWrapper value={contextMock}>
        <MockUrlParamsContextProvider>
          <TransactionDurationAlertTrigger
            alertParams={params as any}
            setAlertParams={() => undefined}
            setAlertProperty={() => undefined}
          />
        </MockUrlParamsContextProvider>
      </MockApmPluginContextWrapper>
    </div>
  );
};
