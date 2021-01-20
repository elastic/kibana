/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import { i18n } from '@kbn/i18n';
import { EuiSelectProps } from '@elastic/eui';

import { SERVER_DATE_FORMAT } from './constants';
import { ChartData } from './components/analytics_chart';

interface ConvertToChartData {
  data: number[];
  startDate: string;
}
export const convertToChartData = ({ data, startDate }: ConvertToChartData): ChartData => {
  const date = moment(startDate, SERVER_DATE_FORMAT);
  return data.map((y, index) => ({
    x: moment(date).add(index, 'days').format(SERVER_DATE_FORMAT),
    y,
  }));
};

export const convertTagsToSelectOptions = (tags: string[]): EuiSelectProps['options'] => {
  // Our server API returns an initial default tag for us, but we don't want to use it because
  // it's not i18n'ed, and also setting the value to '' is nicer for select/param UX
  tags = tags.slice(1);

  const DEFAULT_OPTION = {
    value: '',
    text: i18n.translate(
      'xpack.enterpriseSearch.appSearch.engine.analytics.allTagsDropDownOptionLabel',
      { defaultMessage: 'All analytics tags' }
    ),
  };

  return [
    DEFAULT_OPTION,
    ...tags.map((tag: string) => ({
      value: tag,
      text: tag,
    })),
  ];
};
