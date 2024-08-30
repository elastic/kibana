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
import exampleImgSrc from '../../../assets/service_tab_empty_state/service_tab_empty_state_dependencies.png';

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

export function Default({ title, content, imgSrc }: ComponentProps<typeof ServiceTabEmptyState>) {
  return <ServiceTabEmptyState title={title} content={content} imgSrc={imgSrc} />;
}

Default.args = {
  title: 'Understand the dependencies for your service',
  content:
    'See your services dependencies on both internal and third-party services by instrumenting with APM.',
  imgSrc: exampleImgSrc,
} as ComponentProps<typeof ServiceTabEmptyState>;
