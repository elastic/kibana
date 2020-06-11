/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { storiesOf } from '@storybook/react';
import React from 'react';
import { ErrorRateAlertTrigger } from '.';
import { ApmPluginContextValue } from '../../../context/ApmPluginContext';
import {
  mockApmPluginContextValue,
  MockApmPluginContextWrapper,
} from '../../../context/ApmPluginContext/MockApmPluginContext';

storiesOf('app/ErrorRateAlertTrigger', module).add('example', () => {
  const params = {
    threshold: 2,
    window: '5m',
  };

  return (
    <MockApmPluginContextWrapper
      value={(mockApmPluginContextValue as unknown) as ApmPluginContextValue}
    >
      <div style={{ width: 400 }}>
        <ErrorRateAlertTrigger
          alertParams={params as any}
          setAlertParams={() => undefined}
          setAlertProperty={() => undefined}
        />
      </div>
    </MockApmPluginContextWrapper>
  );
});
