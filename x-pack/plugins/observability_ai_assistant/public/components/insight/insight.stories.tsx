/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ComponentStory } from '@storybook/react';

import { Insight as Component, InsightProps } from './insight';
import { KibanaReactStorybookDecorator } from '../../utils/storybook_decorator';

export default {
  component: Component,
  title: 'app/Molecules/Insight',
  argTypes: {
    debug: {
      control: {
        type: 'boolean',
      },
    },
  },
  decorators: [KibanaReactStorybookDecorator],
};

const Template: ComponentStory<typeof Component> = (props: InsightProps) => (
  <Component {...props} />
);

const defaultProps = {
  title: 'Elastic Assistant',
  actions: [
    { id: 'foo', label: 'Put hands in pockets', handler: () => {} },
    { id: 'bar', label: 'Drop kick', handler: () => {} },
  ],
  description: 'What is the root cause of performance degradation in my service?',
  debug: true,
};

export const Insight = Template.bind({});
Insight.args = defaultProps;
