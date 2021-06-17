/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  reduxDecorator,
  getAddonPanelParameters,
  servicesContextDecorator,
} from '../../../storybook';

import { Home } from './home.component';

export default {
  title: 'Home/Home Page',
  argTypes: {},
  decorators: [reduxDecorator()],
  parameters: [getAddonPanelParameters()],
};

export const NoContent = () => <Home />;
export const HasContent = () => <Home />;

NoContent.decorators = [servicesContextDecorator()];
HasContent.decorators = [servicesContextDecorator({ findWorkpads: 5, findTemplates: true })];
