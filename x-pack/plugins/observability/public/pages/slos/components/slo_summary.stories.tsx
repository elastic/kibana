/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ComponentStory } from '@storybook/react';

import { KibanaReactStorybookDecorator } from '../../../utils/kibana_react.storybook_decorator';
import {
  HEALTHY_ROLLING_SLO,
  historicalSummaryData,
} from '../../../data/slo/historical_summary_data';
import { anSLO } from '../../../data/slo/slo';
import { SloSummary as Component, Props } from './slo_summary';

export default {
  component: Component,
  title: 'app/SLO/ListPage/SloSummary',
  decorators: [KibanaReactStorybookDecorator],
};

const Template: ComponentStory<typeof Component> = (props: Props) => <Component {...props} />;

const defaultProps = {
  slo: anSLO,
  historicalSummary: historicalSummaryData[HEALTHY_ROLLING_SLO],
};

export const SloSummaryStats = Template.bind({});
SloSummaryStats.args = defaultProps;
