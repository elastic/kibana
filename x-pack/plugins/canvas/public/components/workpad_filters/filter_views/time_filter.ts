/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import dateMath from '@elastic/datemath';
import { i18n } from '@kbn/i18n';
import { FilterType, FilterViewSpec, SimpleFilterViewField } from '../../../../types';
import { formatByKey } from '../utils';
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
  getInvalidDateLabel: (date: string) =>
    i18n.translate('xpack.canvas.workpad_filters.timeFilter.invalidDate', {
      defaultMessage: 'Invalid date: {date}',
      values: {
        date,
      },
    }),
};

const { column, type, filterGroup } = defaultFilter.view;

const formatTime = (str: string, roundUp: boolean) => {
  const m = dateMath.parse(str, { roundUp });
  if (!m || !m.isValid()) {
    return strings.getInvalidDateLabel(str);
  }
  return moment(m.toISOString()).format('YYYY-MM-DD HH:mm:ss');
};

export const timeFilter: FilterViewSpec<TimeFilterValue> = {
  name: FilterType.time,
  view: {
    column,
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
    type: {
      label: (type as SimpleFilterViewField).label,
      formatter: formatByKey('type'),
    },
    filterGroup,
  },
};
