/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ComponentProps, ComponentType } from 'react';
import { ServiceTabEmptyState } from '.';
import { MockApmPluginStorybook } from '../../../context/apm_plugin/mock_apm_plugin_storybook';

export default {
  title: 'APP/ServiceTabEmptyState',
  component: ServiceTabEmptyState,
  decorators: [
    (Story: ComponentType) => (
      <MockApmPluginStorybook>
        <Story />
      </MockApmPluginStorybook>
    ),
  ],
};

export function Default({ id }: ComponentProps<typeof ServiceTabEmptyState>) {
  return <ServiceTabEmptyState id={id} />;
}

Default.args = {
  id: 'infraOverview',
} as ComponentProps<typeof ServiceTabEmptyState>;
