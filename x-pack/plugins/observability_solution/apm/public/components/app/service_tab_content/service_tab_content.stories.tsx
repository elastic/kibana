/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ComponentProps, ComponentType } from 'react';
import { ServiceTabContent } from '.';
import {
  ApmPluginContext,
  ApmPluginContextValue,
} from '../../../context/apm_plugin/apm_plugin_context';

const contextMock = {
  core: { http: { basePath: { prepend: () => {} } } },
} as unknown as ApmPluginContextValue;

export default {
  title: 'APP/ServiceTabContent',
  component: ServiceTabContent,
  decorators: [
    (Story: ComponentType) => (
      <ApmPluginContext.Provider value={contextMock}>
        <Story />
      </ApmPluginContext.Provider>
    ),
  ],
};

export function Overview({ tabName }: ComponentProps<typeof ServiceTabContent>) {
  return <ServiceTabContent tabName={tabName}>Overview tab content</ServiceTabContent>;
}

export function Dependencies({ tabName }: ComponentProps<typeof ServiceTabContent>) {
  return <ServiceTabContent tabName={tabName}>Dependencies tab content</ServiceTabContent>;
}

export function Infrastructure({ tabName }: ComponentProps<typeof ServiceTabContent>) {
  return <ServiceTabContent tabName={tabName}>Infrastructure tab content</ServiceTabContent>;
}

export function ServiceMap({ tabName }: ComponentProps<typeof ServiceTabContent>) {
  return <ServiceTabContent tabName={tabName}>ServiceMap tab content</ServiceTabContent>;
}

Overview.args = {
  tabName: 'overview',
} as ComponentProps<typeof ServiceTabContent>;

Dependencies.args = {
  tabName: 'dependencies',
} as ComponentProps<typeof ServiceTabContent>;

Infrastructure.args = {
  tabName: 'infrastructure',
} as ComponentProps<typeof ServiceTabContent>;

ServiceMap.args = {
  tabName: 'service-map',
} as ComponentProps<typeof ServiceTabContent>;
