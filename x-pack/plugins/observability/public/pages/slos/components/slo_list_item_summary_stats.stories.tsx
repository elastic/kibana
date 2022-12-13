/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ComponentStory } from '@storybook/react';

import {
  SloListItemSummaryStats as Component,
  SloListItemSummaryStatsProps,
} from './slo_list_item_summary_stats';
import { slo } from '../../../../common/data/sli_list';

export default {
  component: Component,
  title: 'app/SLO/ListPage/SloListItem/SloListItemSummaryStats',
  argTypes: {},
};

const Template: ComponentStory<typeof Component> = (props: SloListItemSummaryStatsProps) => (
  <Component {...props} />
);

const defaultProps = {
  slo,
};

export const SloList = Template.bind({});
SloList.args = defaultProps;
