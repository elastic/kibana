/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Decorator } from '@storybook/react';
import * as jest from 'jest-mock';
import '@elastic/charts/dist/theme_only_light.css';
import { MockApmPluginStorybook } from '../public/context/apm_plugin/mock_apm_plugin_storybook';

(window as any).jest = jest;

const ApmDecorator: Decorator = (Story, context) => (
  <MockApmPluginStorybook
    routePath={context.parameters.routePath}
    apmContext={context.parameters.apmContext}
    serviceContextValue={context.parameters.serviceContextValue}
  >
    <Story />
  </MockApmPluginStorybook>
);

export const decorators = [ApmDecorator];
