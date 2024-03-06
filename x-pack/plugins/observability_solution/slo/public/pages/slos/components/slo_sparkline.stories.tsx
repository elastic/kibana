/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HistoricalSummaryResponse } from '@kbn/slo-schema';
import { ComponentStory } from '@storybook/react';
import React from 'react';
import { KibanaReactStorybookDecorator } from '@kbn/observability-plugin/public';
import {
  DEGRADING_FAST_ROLLING_SLO,
  HEALTHY_RANDOM_ROLLING_SLO,
  HEALTHY_ROLLING_SLO,
  HEALTHY_STEP_DOWN_ROLLING_SLO,
  historicalSummaryData,
  NO_DATA_TO_HEALTHY_ROLLING_SLO,
} from '../../../data/slo/historical_summary_data';
import { Props, SloSparkline as Component } from './slo_sparkline';

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
  data: toBudgetBurnDown(
    historicalSummaryData.find((datum) => datum.sloId === HEALTHY_ROLLING_SLO)!.data
  ),
};

export const AreaWithHealthyRandomData = Template.bind({});
AreaWithHealthyRandomData.args = {
  chart: 'area',
  state: 'success',
  id: 'history',
  data: toBudgetBurnDown(
    historicalSummaryData.find((datum) => datum.sloId === HEALTHY_RANDOM_ROLLING_SLO)!.data
  ),
};

export const AreaWithHealthyStepDownData = Template.bind({});
AreaWithHealthyStepDownData.args = {
  chart: 'area',
  state: 'success',
  id: 'history',
  data: toBudgetBurnDown(
    historicalSummaryData.find((datum) => datum.sloId === HEALTHY_STEP_DOWN_ROLLING_SLO)!.data
  ),
};

export const AreaWithDegradingLinearData = Template.bind({});
AreaWithDegradingLinearData.args = {
  chart: 'area',
  state: 'error',
  id: 'history',
  data: toBudgetBurnDown(
    historicalSummaryData.find((datum) => datum.sloId === DEGRADING_FAST_ROLLING_SLO)!.data
  ),
};

export const AreaWithNoDataToDegradingLinearData = Template.bind({});
AreaWithNoDataToDegradingLinearData.args = {
  chart: 'area',
  state: 'error',
  id: 'history',
  data: toBudgetBurnDown(
    historicalSummaryData.find((datum) => datum.sloId === NO_DATA_TO_HEALTHY_ROLLING_SLO)!.data
  ),
};

export const LineWithHealthyFlatData = Template.bind({});
LineWithHealthyFlatData.args = {
  chart: 'line',
  state: 'success',
  id: 'history',
  data: toSliHistory(
    historicalSummaryData.find((datum) => datum.sloId === HEALTHY_ROLLING_SLO)!.data
  ),
};

export const LineWithHealthyRandomData = Template.bind({});
LineWithHealthyRandomData.args = {
  chart: 'line',
  state: 'success',
  id: 'history',
  data: toSliHistory(
    historicalSummaryData.find((datum) => datum.sloId === HEALTHY_RANDOM_ROLLING_SLO)!.data
  ),
};

export const LineWithHealthyStepDownData = Template.bind({});
LineWithHealthyStepDownData.args = {
  chart: 'line',
  state: 'success',
  id: 'history',
  data: toSliHistory(
    historicalSummaryData.find((datum) => datum.sloId === HEALTHY_STEP_DOWN_ROLLING_SLO)!.data
  ),
};

export const LineWithDegradingLinearData = Template.bind({});
LineWithDegradingLinearData.args = {
  chart: 'line',
  state: 'error',
  id: 'history',
  data: toSliHistory(
    historicalSummaryData.find((datum) => datum.sloId === DEGRADING_FAST_ROLLING_SLO)!.data
  ),
};

export const LineWithNoDataToDegradingLinearData = Template.bind({});
LineWithNoDataToDegradingLinearData.args = {
  chart: 'line',
  state: 'error',
  id: 'history',
  data: toSliHistory(
    historicalSummaryData.find((datum) => datum.sloId === NO_DATA_TO_HEALTHY_ROLLING_SLO)!.data
  ),
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
