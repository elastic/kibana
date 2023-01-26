/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ComponentStory } from '@storybook/react';

import { HistoricalSummaryResponse } from '@kbn/slo-schema';
import {
  HEALTHY_ROLLING_SLO,
  HEALTHY_RANDOM_ROLLING_SLO,
  HEALTHY_STEP_DOWN_ROLLING_SLO,
  historicalSummaryData,
  DEGRADING_FAST_ROLLING_SLO,
  NO_DATA_TO_HEALTHY_ROLLING_SLO,
} from '../../../fixtures/slo/historical_summary_data';
import { KibanaReactStorybookDecorator } from '../../../utils/kibana_react.storybook_decorator';
import { SloSparkline as Component, Props } from './slo_sparkline';

export default {
  component: Component,
  title: 'app/SLO/ListPage/SloSparkline',
  decorators: [KibanaReactStorybookDecorator],
};

const Template: ComponentStory<typeof Component> = (props: Props) => <Component {...props} />;

export const AreaWithHealthyFlatData = Template.bind({});
AreaWithHealthyFlatData.args = {
  chart: 'area',
  state: 'success',
  id: 'history',
  data: toBudgetBurnDown(historicalSummaryData[HEALTHY_ROLLING_SLO]),
};

export const AreaWithHealthyRandomData = Template.bind({});
AreaWithHealthyRandomData.args = {
  chart: 'area',
  state: 'success',
  id: 'history',
  data: toBudgetBurnDown(historicalSummaryData[HEALTHY_RANDOM_ROLLING_SLO]),
};

export const AreaWithHealthyStepDownData = Template.bind({});
AreaWithHealthyStepDownData.args = {
  chart: 'area',
  state: 'success',
  id: 'history',
  data: toBudgetBurnDown(historicalSummaryData[HEALTHY_STEP_DOWN_ROLLING_SLO]),
};

export const AreaWithDegradingLinearData = Template.bind({});
AreaWithDegradingLinearData.args = {
  chart: 'area',
  state: 'error',
  id: 'history',
  data: toBudgetBurnDown(historicalSummaryData[DEGRADING_FAST_ROLLING_SLO]),
};

export const AreaWithNoDataToDegradingLinearData = Template.bind({});
AreaWithNoDataToDegradingLinearData.args = {
  chart: 'area',
  state: 'error',
  id: 'history',
  data: toBudgetBurnDown(historicalSummaryData[NO_DATA_TO_HEALTHY_ROLLING_SLO]),
};

export const LineWithHealthyFlatData = Template.bind({});
LineWithHealthyFlatData.args = {
  chart: 'line',
  state: 'success',
  id: 'history',
  data: toSliHistory(historicalSummaryData[HEALTHY_ROLLING_SLO]),
};

export const LineWithHealthyRandomData = Template.bind({});
LineWithHealthyRandomData.args = {
  chart: 'line',
  state: 'success',
  id: 'history',
  data: toSliHistory(historicalSummaryData[HEALTHY_RANDOM_ROLLING_SLO]),
};

export const LineWithHealthyStepDownData = Template.bind({});
LineWithHealthyStepDownData.args = {
  chart: 'line',
  state: 'success',
  id: 'history',
  data: toSliHistory(historicalSummaryData[HEALTHY_STEP_DOWN_ROLLING_SLO]),
};

export const LineWithDegradingLinearData = Template.bind({});
LineWithDegradingLinearData.args = {
  chart: 'line',
  state: 'error',
  id: 'history',
  data: toSliHistory(historicalSummaryData[DEGRADING_FAST_ROLLING_SLO]),
};

export const LineWithNoDataToDegradingLinearData = Template.bind({});
LineWithNoDataToDegradingLinearData.args = {
  chart: 'line',
  state: 'error',
  id: 'history',
  data: toSliHistory(historicalSummaryData[NO_DATA_TO_HEALTHY_ROLLING_SLO]),
};

function toBudgetBurnDown(data: HistoricalSummaryResponse[]) {
  return data.map((datum) => ({
    key: new Date(datum.date).getTime(),
    value: datum.status === 'NO_DATA' ? undefined : datum.errorBudget.remaining,
  }));
}

function toSliHistory(data: HistoricalSummaryResponse[]) {
  return data.map((datum) => ({
    key: new Date(datum.date).getTime(),
    value: datum.status === 'NO_DATA' ? undefined : datum.sliValue,
  }));
}
