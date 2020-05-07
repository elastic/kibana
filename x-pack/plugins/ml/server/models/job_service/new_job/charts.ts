/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { newJobLineChartProvider } from './line_chart';
import { newJobPopulationChartProvider } from './population_chart';
import { callWithRequestType } from '../../../../common/types/kibana';

export function newJobChartsProvider(callWithRequest: callWithRequestType) {
  const { newJobLineChart } = newJobLineChartProvider(callWithRequest);
  const { newJobPopulationChart } = newJobPopulationChartProvider(callWithRequest);

  return {
    newJobLineChart,
    newJobPopulationChart,
  };
}
