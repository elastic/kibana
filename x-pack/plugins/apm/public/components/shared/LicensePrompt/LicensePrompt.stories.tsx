/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { ComponentType } from 'react';
import { LicensePrompt } from '.';
import {
  ApmPluginContext,
  ApmPluginContextValue,
} from '../../../context/ApmPluginContext';

const contextMock = ({
  core: { http: { basePath: { prepend: () => {} } } },
} as unknown) as ApmPluginContextValue;

export default {
  title: 'app/LicensePrompt',
  component: LicensePrompt,
  decorators: [
    (Story: ComponentType) => (
      <ApmPluginContext.Provider value={contextMock}>
        <Story />{' '}
      </ApmPluginContext.Provider>
    ),
  ],
};

export function Example() {
  return (
    <LicensePrompt text="To create Feature name, you must be subscribed to an Elastic X license or above." />
  );
}
