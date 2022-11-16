/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ComponentStory } from '@storybook/react';

import { Editor as Component, Props } from './editor';

export default {
  title: 'app/SLO/BurnRateRule',
  component: Component,
  argTypes: {},
};

const Template: ComponentStory<typeof Component> = (props: Props) => <Component {...props} />;

const defaultProps = {};

export const BurnRateRule = Template.bind({});
BurnRateRule.args = defaultProps;
