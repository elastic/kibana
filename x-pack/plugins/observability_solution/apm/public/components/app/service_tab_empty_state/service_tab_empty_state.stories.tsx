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

export function Default({ title, content, imgName }: ComponentProps<typeof ServiceTabEmptyState>) {
  return <ServiceTabEmptyState title={title} content={content} imgName={imgName} />;
}

Default.args = {
  title: 'Understand the dependencies for your service',
  content:
    'See your services dependencies on both internal and third-party services by instrumenting with APM.',
  imgName: 'service_tab_empty_state_transactions.png',
} as ComponentProps<typeof ServiceTabEmptyState>;
