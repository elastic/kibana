/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedLens } from './saved_lens';
import { getQueryFilters } from '../../../public/lib/build_embeddable_filters';
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

describe('savedLens', () => {
  const fn = savedLens().fn;
  const args = {
    id: 'some-id',
    title: null,
    timerange: null,
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
});
