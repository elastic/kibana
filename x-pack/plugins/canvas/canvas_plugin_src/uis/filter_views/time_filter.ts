/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dateMath from '@elastic/datemath';
import { i18n } from '@kbn/i18n';
import { FilterType } from '../../../types';
import { FilterViewSpec } from '../../../public/filter_view_types';
import { defaultFilter } from './default_filter';

export interface TimeFilterValue {
  to: string;
  from: string;
}

const strings = {
  getFromLabel: () =>
    i18n.translate('xpack.canvas.workpad_filters.timeFilter.from', {
      defaultMessage: 'From',
    }),
  getToLabel: () =>
    i18n.translate('xpack.canvas.workpad_filters.timeFilter.to', {
      defaultMessage: 'To',
    }),
};

const defConfig = defaultFilter.view();

const formatTime = (str: string, roundUp: boolean) => {
  const moment = dateMath.parse(str, { roundUp });
  if (!moment || !moment.isValid()) {
    return `Invalid date: ${str}`;
  }

  return moment.format('YYYY-mm-DD HH:mm:ss');
};

export const timeFilter: FilterViewSpec<TimeFilterValue> = {
  name: FilterType.time,
  view: () => ({
    ...defConfig,
    value: ({ to, from }) => ({
      from: {
        label: strings.getFromLabel(),
        formatter: () => formatTime(from, false),
      },
      to: {
        label: strings.getToLabel(),
        formatter: () => formatTime(to, true),
      },
    }),
  }),
};
