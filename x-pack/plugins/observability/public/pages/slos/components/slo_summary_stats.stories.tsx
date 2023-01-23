/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ComponentStory } from '@storybook/react';

import { anSLO } from '../../../data/slo/slo';
import { SloSummaryStats as Component, SloSummaryStatsProps } from './slo_summary_stats';

export default {
  component: Component,
  title: 'app/SLO/ListPage/SloSummaryStats',
  argTypes: {},
};

const Template: ComponentStory<typeof Component> = (props: SloSummaryStatsProps) => (
  <Component {...props} />
);

const defaultProps = {
  slo: anSLO,
};

export const SloSummaryStats = Template.bind({});
SloSummaryStats.args = defaultProps;
