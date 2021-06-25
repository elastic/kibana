/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPanel } from '@elastic/eui';
import React from 'react';

import { reduxDecorator, getDisableStoryshotsParameter } from '../../../../storybook';

import { WorkpadTemplates as Component } from './workpad_templates';

export default {
  title: 'Home/Tabs',
  component: Component,
  argTypes: {
    findTemplates: {
      name: 'Has templates?',
      type: {
        name: 'boolean',
      },
      defaultValue: true,
      control: {
        type: 'boolean',
      },
    },
  },
  decorators: [reduxDecorator()],
  parameters: { ...getDisableStoryshotsParameter() },
};

export const WorkpadTemplates = () => (
  <EuiPanel>
    <Component />
  </EuiPanel>
);
