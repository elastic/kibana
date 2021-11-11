/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ComponentProps, ComponentType } from 'react';
import { LicensePrompt } from '.';
import { MockApmAppContextProvider } from '../../../context/mock_apm_app/mock_apm_app_context';

export default {
  title: 'shared/LicensePrompt',
  component: LicensePrompt,
  decorators: [
    (Story: ComponentType) => (
      <MockApmAppContextProvider>
        <Story />
      </MockApmAppContextProvider>
    ),
  ],
};

export function Example({
  showBetaBadge,
  text,
}: ComponentProps<typeof LicensePrompt>) {
  return <LicensePrompt showBetaBadge={showBetaBadge} text={text} />;
}
Example.args = {
  showBetaBadge: false,
  text: 'To create Feature name, you must be subscribed to an Elastic X license or above.',
} as ComponentProps<typeof LicensePrompt>;
