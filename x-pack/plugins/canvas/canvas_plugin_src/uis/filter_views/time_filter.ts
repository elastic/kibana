/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FilterType } from '../../../types';
import { FilterViewSpec } from '../../../public/filter_view_types';
import { defaultFilter } from './default_filter';

const defConfig = defaultFilter.view();

export const timeFilter: FilterViewSpec = {
  name: FilterType.time,
  view: () => ({
    ...defConfig,
    value: (val: any) => ({
      to: {
        label: 'To',
        formatter: () => 'some date to',
      },
      from: {
        label: 'From',
        // formatter: () => moment(val.from),
        formatter: () => 'some date from',
      },
    }),
  }),
};
