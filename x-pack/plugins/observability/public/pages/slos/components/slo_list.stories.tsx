/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ComponentStory } from '@storybook/react';
import { EuiPageTemplate } from '@elastic/eui';

import { SloList as Component } from './slo_list';

export default {
  component: Component,
  title: 'app/SlosPage/SloList',
  argTypes: {},
};

const Template: ComponentStory<typeof Component> = () => <Component />;

const TemplateWithPageTemplate: ComponentStory<typeof Component> = () => (
  <EuiPageTemplate>
    <Component />
  </EuiPageTemplate>
);

const defaultProps = {};

export const SloList = Template.bind({});
SloList.args = defaultProps;

export const SloListUsedWithinPageTemplate = TemplateWithPageTemplate.bind({});
SloListUsedWithinPageTemplate.args = defaultProps;
