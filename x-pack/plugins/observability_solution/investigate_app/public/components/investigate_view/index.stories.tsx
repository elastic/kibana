/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ComponentMeta, ComponentStoryObj } from '@storybook/react';
import React from 'react';
import { InvestigateView as Component } from '.';
import { KibanaReactStorybookDecorator } from '../../../.storybook/storybook_decorator';

const meta: ComponentMeta<typeof Component> = {
  component: Component,
  title: 'app/Organisms/InvestigateView',
  decorators: [KibanaReactStorybookDecorator],
};

export default meta;

const defaultProps: ComponentStoryObj<typeof Component> = {
  args: {},
  render: (props) => <Component {...props} />,
};

export const InvestigateViewStory: ComponentStoryObj<typeof Component> = {
  ...defaultProps,
  name: 'default',
};
