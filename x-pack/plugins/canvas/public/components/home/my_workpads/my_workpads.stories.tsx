/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiPanel } from '@elastic/eui';

import { reduxDecorator, getDisableStoryshotsParameter } from '../../../../storybook';

import { MyWorkpads as Component } from './my_workpads';

export default {
  title: 'Home/Tabs',
  component: Component,
  argTypes: {
    findWorkpads: {
      name: 'Number of workpads',
      type: { name: 'number' },
      defaultValue: 5,
      control: {
        type: 'range',
      },
    },
  },
  decorators: [reduxDecorator()],
  parameters: { ...getDisableStoryshotsParameter() },
};

export const MyWorkpads = () => (
  <EuiPanel>
    <Component />
  </EuiPanel>
);
