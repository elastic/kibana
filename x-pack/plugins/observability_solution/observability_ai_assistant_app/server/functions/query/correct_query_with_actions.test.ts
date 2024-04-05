/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { correctQueryWithActions } from './correct_query_with_actions';

describe('correctQueryWithActions', () => {
  it(`fixes errors correctly for a query with one syntax error for stats`, async () => {
    // stats
    const fixedQuery = await correctQueryWithActions('from logstash-* | stats aveg(bytes)');
    expect(fixedQuery).toBe('from logstash-* | stats avg(bytes)');
  });

  it(`fixes errors correctly for a query with 2 syntax errors for stats`, async () => {
    const fixedQuery = await correctQueryWithActions(
      'from logstash-* | stats aveg(bytes), max2(bytes)'
    );
    expect(fixedQuery).toBe('from logstash-* | stats avg(bytes), max(bytes)');
  });

  it(`fixes errors correctly for a query with one syntax error for eval`, async () => {
    // stats
    const fixedQuery = await correctQueryWithActions(
      'from logstash-* | stats var0 = max(bytes) | eval ab(var0)'
    );
    expect(fixedQuery).toBe('from logstash-* | stats var0 = max(bytes) | eval abs(var0)');
  });
});
