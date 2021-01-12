/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';

import { SERVER_DATE_FORMAT } from './constants';
import { ChartData } from './components/analytics_chart';

interface ConvertToChartsData {
  data: number[];
  startDate: string;
}
export const convertToChartsData = ({ data, startDate }: ConvertToChartsData): ChartData => {
  const date = moment(startDate, SERVER_DATE_FORMAT);
  return data.map((y, index) => ({
    x: moment(date).add(index, 'days').format(SERVER_DATE_FORMAT),
    y,
  }));
};
