/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FilterItemObj } from '@kbn/alerts-ui-shared/src/alert_filter_controls/types';
import { formatPageFilterSearchParam } from './format_page_filter_search_param';

describe('formatPageFilterSearchParam', () => {
  it('returns the same data when all values are provided', () => {
    const filter: FilterItemObj = {
      title: 'User',
      fieldName: 'user.name',
      selectedOptions: ['test_user'],
      existsSelected: true,
      exclude: true,
    };

    expect(formatPageFilterSearchParam([filter])).toEqual([filter]);
  });

  it('it sets default values when they are undefined', () => {
    const filter: FilterItemObj = {
      fieldName: 'user.name',
    };

    expect(formatPageFilterSearchParam([filter])).toEqual([
      {
        title: 'user.name',
        selectedOptions: [],
        fieldName: 'user.name',
        existsSelected: false,
        exclude: false,
      },
    ]);
  });
});
