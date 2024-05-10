/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ComponentStory } from '@storybook/react';
import React from 'react';
import { KibanaReactStorybookDecorator } from '@kbn/observability-plugin/public';
import {
  HEALTHY_ROLLING_SLO,
  historicalSummaryData,
} from '../../../data/slo/historical_summary_data';
import { buildSlo } from '../../../data/slo/slo';
import { Props, SloSummary as Component } from './slo_summary';

export default {
  component: Component,
  title: 'app/SLO/ListPage/SloSummary',
  decorators: [KibanaReactStorybookDecorator],
};

const Template: ComponentStory<typeof Component> = (props: Props) => <Component {...props} />;

const defaultProps = {
  slo: buildSlo(),
  historicalSummary: historicalSummaryData.find((datum) => datum.sloId === HEALTHY_ROLLING_SLO)!
    .data,
  historicalSummaryLoading: false,
};

export const WithHistoricalData = Template.bind({});
WithHistoricalData.args = { ...defaultProps };

export const WithLoadingData = Template.bind({});
WithLoadingData.args = { ...defaultProps, historicalSummaryLoading: true };
