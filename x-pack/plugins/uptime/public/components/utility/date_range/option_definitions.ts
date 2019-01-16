/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface DateRangeOption {
  id: string;
  title: string;
  getRange: () => { unit: string; value: number };
}

export const options: DateRangeOption[] = [
  {
    id: '24hrs',
    title: 'Last 24 Hours',
    getRange: () => ({
      unit: 'h',
      value: 24,
    }),
  },
  {
    id: '12hr',
    title: 'Last 12 Hours',
    getRange: () => ({
      unit: 'h',
      value: 12,
    }),
  },
  {
    id: '2d',
    title: 'Last 2 Days',
    getRange: () => ({
      unit: 'd',
      value: 2,
    }),
  },
  {
    id: 'lastWeek',
    title: 'Past week',
    getRange: () => ({
      unit: 'w',
      value: 1,
    }),
  },
];
