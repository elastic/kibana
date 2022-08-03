/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import React from 'react';
import { Story } from '@storybook/react';
import { TimeRangeBounds } from '@kbn/data-plugin/common';
import { ChartSeries } from '../../hooks/use_aggregated_indicators';
import { IndicatorsBarChart } from './indicators_barchart';

const mockIndicators: ChartSeries[] = [
  {
    x: '1 Jan 2022 00:00:00 GMT',
    y: 2,
    g: '[Filebeat] AbuseCH Malware',
  },
  {
    x: '1 Jan 2022 00:00:00 GMT',
    y: 10,
    g: '[Filebeat] AbuseCH MalwareBazaar',
  },
  {
    x: '1 Jan 2022 06:00:00 GMT',
    y: 0,
    g: '[Filebeat] AbuseCH Malware',
  },
  {
    x: '1 Jan 2022 06:00:00 GMT',
    y: 0,
    g: '[Filebeat] AbuseCH MalwareBazaar',
  },
  {
    x: '1 Jan 2022 12:00:00 GMT',
    y: 25,
    g: '[Filebeat] AbuseCH Malware',
  },
  {
    x: '1 Jan 2022 18:00:00 GMT',
    y: 15,
    g: '[Filebeat] AbuseCH MalwareBazaar',
  },
];
const validDate: string = '1 Jan 2022 00:00:00 GMT';
const numberOfDays = 1;
const mockDateRange: TimeRangeBounds = {
  min: moment(validDate),
  max: moment(validDate).add(numberOfDays, 'days'),
};
const mockHeight = '500px';

export default {
  component: IndicatorsBarChart,
  title: 'IndicatorsBarChart',
};

export const Default: Story<void> = () => (
  <IndicatorsBarChart indicators={mockIndicators} dateRange={mockDateRange} />
);

export const NoData: Story<void> = () => (
  <IndicatorsBarChart indicators={[]} dateRange={mockDateRange} />
);

export const CustomHeight: Story<void> = () => (
  <IndicatorsBarChart indicators={mockIndicators} dateRange={mockDateRange} height={mockHeight} />
);
