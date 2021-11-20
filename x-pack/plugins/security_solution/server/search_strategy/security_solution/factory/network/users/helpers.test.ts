/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getUsersEdges } from './helpers';
import { mockSearchStrategyResponse, formattedSearchStrategyResponse } from './__mocks__';

describe('#getUsers', () => {
  test('will format edges correctly', () => {
    const edges = getUsersEdges(mockSearchStrategyResponse);
    expect(edges).toEqual(formattedSearchStrategyResponse.edges);
  });
});
