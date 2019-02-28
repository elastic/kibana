/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { pure } from 'recompose';

import { HorizontalBarChart, HorizontalBarChartData } from '../../../horizontal_bar_chart';

import * as i18n from './translations';

interface TypesBarProps {
  data: HorizontalBarChartData[];
  loading: boolean;
}

export const TypesBar = pure<TypesBarProps>(({ data, loading }) => (
  <HorizontalBarChart
    loading={loading}
    title={i18n.KPI_EVENT_TYPES}
    width={490}
    height={279}
    barChartdata={data}
  />
));
