/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedVisualization } from './saved_visualization';
import { getQueryFilters } from '../../../common/lib/build_embeddable_filters';
import { ExpressionValueFilter } from '../../../types';

const filterContext: ExpressionValueFilter = {
  type: 'filter',
  and: [
    {
      type: 'filter',
      and: [],
      value: 'filter-value',
      column: 'filter-column',
      filterType: 'exactly',
    },
    {
      type: 'filter',
      and: [],
      column: 'time-column',
      filterType: 'time',
      from: '2019-06-04T04:00:00.000Z',
      to: '2019-06-05T04:00:00.000Z',
    },
  ],
};

describe('savedVisualization', () => {
  const fn = savedVisualization().fn;
  const args = {
    id: 'some-id',
    timerange: null,
    colors: null,
    hideLegend: null,
    title: null,
  };

  it('accepts null context', () => {
    const expression = fn(null, args, {} as any);

    expect(expression.input.filters).toEqual([]);
  });

  it('accepts filter context', () => {
    const expression = fn(filterContext, args, {} as any);
    const embeddableFilters = getQueryFilters(filterContext.and);

    expect(expression.input.filters).toEqual(embeddableFilters);
  });

  it('accepts an empty title when title is disabled', () => {
    const expression = fn(null, { ...args, title: '' }, {} as any);
    expect(expression.input.title).toEqual('');
  });

  it('accepts time range', () => {
    const expression = fn(
      null,
      { ...args, timerange: { type: 'timerange', from: '15m-now', to: 'now' } },
      {} as any
    );
    expect(expression.input.timeRange).toHaveProperty('from', '15m-now');
    expect(expression.input.timeRange).toHaveProperty('to', 'now');
    expect(expression.input.timeRange).not.toHaveProperty('type');
  });
});
