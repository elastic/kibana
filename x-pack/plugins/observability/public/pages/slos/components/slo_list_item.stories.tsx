/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ComponentStory } from '@storybook/react';

import { SloListItem as Component, SloListItemProps } from './slo_list_item';
import { slo } from '../../../../common/data/sli_list';

export default {
  component: Component,
  title: 'app/SLO/ListPage/SloListItem',
  argTypes: {},
};

const Template: ComponentStory<typeof Component> = (props: SloListItemProps) => (
  <Component {...props} />
);

const defaultProps = {
  slo,
};

export const SloList = Template.bind({});
SloList.args = defaultProps;
