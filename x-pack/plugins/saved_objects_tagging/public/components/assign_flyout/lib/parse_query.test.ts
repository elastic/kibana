/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Query } from '@elastic/eui';
import { parseQuery } from './parse_query';

describe('parseQuery', () => {
  it('parses the query text', () => {
    const query = Query.parse('some search');

    expect(parseQuery(query)).toEqual({
      queryText: 'some search',
    });
  });

  it('parses the types', () => {
    const query = Query.parse('type:(index-pattern or dashboard) kibana');

    expect(parseQuery(query)).toEqual({
      queryText: 'kibana',
      selectedTypes: ['index-pattern', 'dashboard'],
    });
  });

  it('does not fail on unknown fields', () => {
    const query = Query.parse('unknown:(hello or dolly) some search');

    expect(parseQuery(query)).toEqual({
      queryText: 'some search',
    });
  });
});
