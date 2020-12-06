/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { ErrorCountAlertTrigger } from '.';
import { ApmPluginContextValue } from '../../../context/apm_plugin/apm_plugin_context';
import {
  mockApmPluginContextValue,
  MockApmPluginContextWrapper,
} from '../../../context/apm_plugin/mock_apm_plugin_context';

export default {
  title: 'app/ErrorCountAlertTrigger',
  component: ErrorCountAlertTrigger,
  decorators: [
    (Story: React.ComponentClass) => (
      <MockApmPluginContextWrapper
        value={(mockApmPluginContextValue as unknown) as ApmPluginContextValue}
      >
        <MemoryRouter>
          <div style={{ width: 400 }}>
            <Story />
          </div>
        </MemoryRouter>
      </MockApmPluginContextWrapper>
    ),
  ],
};

export function Example() {
  const params = {
    threshold: 2,
    window: '5m',
  };

  return (
    <ErrorCountAlertTrigger
      alertParams={params as any}
      setAlertParams={() => undefined}
      setAlertProperty={() => undefined}
    />
  );
}
