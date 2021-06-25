/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { reduxDecorator, getDisableStoryshotsParameter } from '../../../storybook';

import { Home } from './home';

export default {
  title: 'Home',
  component: Home,
  argTypes: {
    findWorkpads: {
      name: 'Number of workpads',
      type: { name: 'number' },
      defaultValue: 5,
      control: {
        type: 'range',
      },
    },
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

export const HomePage = () => <Home />;
