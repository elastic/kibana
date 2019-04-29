/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getFilterFromMust } from '../get_filter_from_must';

describe('getFilterFromMust', () => {
  it('applies date range only for undefined filter string', () => {
    const result = getFilterFromMust('start range', 'end range');
    expect(result).toMatchSnapshot();
  });
  it('applies filter clauses to output object', () => {
    const result = getFilterFromMust(
      'start range',
      'end range',
      '{"bool":{"must":[{"match":{"monitor.status":{"query":"up","operator":"and"}}}]}}'
    );
    expect(result).toMatchSnapshot();
  });
});
