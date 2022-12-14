/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { frequentItems } from '../../../common/__mocks__/artificial_logs/frequent_items';
import { getValuesDescending } from './get_values_descending';

describe('getValuesDescending', () => {
  it('get descending values for field response_code', () => {
    expect(getValuesDescending(frequentItems, 'response_code')).toEqual(['500', '200', '404']);
  });

  it('get descending values for field url', () => {
    expect(getValuesDescending(frequentItems, 'url')).toEqual(['home.php']);
  });

  it('get descending values for field user', () => {
    expect(getValuesDescending(frequentItems, 'user')).toEqual(['Peter', 'Mary', 'Paul']);
  });
});
