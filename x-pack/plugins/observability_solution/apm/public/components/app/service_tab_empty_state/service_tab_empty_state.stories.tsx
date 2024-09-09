/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ComponentProps, ComponentType } from 'react';
import { ServiceTabEmptyState } from '.';
import {
  ApmPluginContext,
  ApmPluginContextValue,
} from '../../../context/apm_plugin/apm_plugin_context';

const contextMock = {
  core: { http: { basePath: { prepend: () => {} } } },
} as unknown as ApmPluginContextValue;

export default {
  title: 'APP/ServiceTabEmptyState',
  component: ServiceTabEmptyState,
  decorators: [
    (Story: ComponentType) => (
      <ApmPluginContext.Provider value={contextMock}>
        <Story />
      </ApmPluginContext.Provider>
    ),
  ],
};

export function Default({ id }: ComponentProps<typeof ServiceTabEmptyState>) {
  return <ServiceTabEmptyState id={id} />;
}

Default.args = {
  id: 'infraOverview',
} as ComponentProps<typeof ServiceTabEmptyState>;
