/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dateMath from '@elastic/datemath';
import { FilterType } from '../../../types';
import { FilterViewSpec } from '../../../public/filter_view_types';
import { defaultFilter } from './default_filter';

export interface TimeFilterValue {
  to: string;
  from: string;
}

const defConfig = defaultFilter.view();

const formatTime = (str: string, roundUp: boolean) => {
  const moment = dateMath.parse(str, { roundUp });
  if (!moment || !moment.isValid()) {
    return `Invalid date: ${str}`;
  }

  return moment.toISOString();
};

export const timeFilter: FilterViewSpec<TimeFilterValue> = {
  name: FilterType.time,
  view: () => ({
    ...defConfig,
    value: ({ to, from }) => ({
      to: {
        label: 'To',
        formatter: () => formatTime(to, true),
      },
      from: {
        label: 'From',
        formatter: () => formatTime(from, false),
      },
    }),
  }),
};
