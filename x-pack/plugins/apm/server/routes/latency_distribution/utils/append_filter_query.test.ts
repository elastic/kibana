/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { appendFilterQuery } from './append_filtery_query';

describe('#appendFilterQuery', () => {
  const mockQuery = {
    bool: {
      filter: [
        { term: { 'service.name': 'opbeans-java' } },
        { term: { 'transaction.type': 'request' } },
        { term: { 'transaction.name': 'DispatcherServlet#doGet' } },
      ],
    },
  };
  const mockFilterQuery = {
    exists: { field: 'transaction.duration.histogram' },
  };

  it('appends filter query to list of filters within the given query', () => {
    const query = appendFilterQuery(mockQuery, mockFilterQuery);
    expect(query).toMatchSnapshot();
  });

  it('creates new filtered query when the given query is blank', () => {
    const query = appendFilterQuery(null, mockFilterQuery);
    expect(query).toMatchSnapshot();
  });

  it('does not change query when given a blank filter query', () => {
    const query = appendFilterQuery(mockQuery, null);
    expect(query).toMatchSnapshot();
  });
});
