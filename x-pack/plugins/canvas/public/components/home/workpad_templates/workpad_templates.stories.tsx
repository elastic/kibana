/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPanel } from '@elastic/eui';
import React from 'react';

import { reduxDecorator } from '../../../../storybook';
import { argTypes } from '../../../../storybook/constants';

import { WorkpadTemplates as Component } from './workpad_templates';

const { hasTemplates } = argTypes;

export default {
  title: 'Home/Tabs/Workpad Templates',
  component: Component,
  argTypes: {
    hasTemplates,
  },
  decorators: [reduxDecorator()],
  parameters: {},
};

export const WorkpadTemplates = () => (
  <EuiPanel>
    <Component />
  </EuiPanel>
);
