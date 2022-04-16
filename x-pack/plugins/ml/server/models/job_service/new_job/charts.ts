/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core/server';
import { newJobLineChartProvider } from './line_chart';
import { newJobPopulationChartProvider } from './population_chart';

export function newJobChartsProvider(client: IScopedClusterClient) {
  const { newJobLineChart } = newJobLineChartProvider(client);
  const { newJobPopulationChart } = newJobPopulationChartProvider(client);

  return {
    newJobLineChart,
    newJobPopulationChart,
  };
}
