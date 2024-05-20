/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ComponentStory } from '@storybook/react';

import { KibanaReactStorybookDecorator } from '@kbn/observability-plugin/public';
import { SloList as Component } from './slo_list';

export default {
  component: Component,
  title: 'app/SLO/ListPage/SloList',
  argTypes: {},
  decorators: [KibanaReactStorybookDecorator],
};

const Template: ComponentStory<typeof Component> = () => <Component />;

const defaultProps = {};

export const SloList = Template.bind({});
SloList.args = defaultProps;
