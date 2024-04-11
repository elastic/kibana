/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { correctQueryWithActions } from './correct_query_with_actions';

describe('correctQueryWithActions', () => {
  it(`fixes errors correctly for a query with one syntax error for stats`, async () => {
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
    const fixedQuery = await correctQueryWithActions(
      'from logstash-* | stats var0 = max(bytes) | eval ab(var0) | limit 1'
    );
    expect(fixedQuery).toBe('from logstash-* | stats var0 = max(bytes) | eval abs(var0) | limit 1');
  });

  it(`fixes errors correctly for a query with two syntax error for eval`, async () => {
    const fixedQuery = await correctQueryWithActions(
      'from logstash-* | stats var0 = max2(bytes) | eval ab(var0) | limit 1'
    );
    expect(fixedQuery).toBe('from logstash-* | stats var0 = max(bytes) | eval abs(var0) | limit 1');
  });

  it(`fixes errors correctly for a query with missing quotes`, async () => {
    const fixedQuery = await correctQueryWithActions('from logstash-* | keep field-1');
    expect(fixedQuery).toBe('from logstash-* | keep `field-1`');
  });

  it(`fixes errors correctly for a query with missing quotes in multiple commands`, async () => {
    const fixedQuery = await correctQueryWithActions(
      'from logstash-* | stats avg(field-1) | eval abs(field-2)'
    );
    expect(fixedQuery).toBe('from logstash-* | stats avg(`field-1`) | eval abs(`field-2`)');
  });

  it(`fixes errors correctly for a query with missing quotes and keep with multiple fields`, async () => {
    const fixedQuery = await correctQueryWithActions('from logstash-* | keep field-1, field-2');
    expect(fixedQuery).toBe('from logstash-* | keep `field-1`, `field-2`');
  });

  it(`fixes errors correctly for a query with missing quotes with variable assignment`, async () => {
    const fixedQuery = await correctQueryWithActions('from logstash-* | stats var1 = avg(field-1)');
    expect(fixedQuery).toBe('from logstash-* | stats var1 = avg(`field-1`)');
  });

  it(`fixes errors correctly for a query with missing quotes in an aggregation`, async () => {
    const fixedQuery = await correctQueryWithActions('from logstash-* | stats avg(field-1)');
    expect(fixedQuery).toBe('from logstash-* | stats avg(`field-1`)');
  });

  it(`fixes errors correctly for a query with typo on stats and wrong quotes`, async () => {
    const fixedQuery = await correctQueryWithActions('from logstash-* | stats aveg(field-1)');
    expect(fixedQuery).toBe('from logstash-* | stats avg(`field-1`)');
  });

  it(`fixes errors correctly for a query with missing quotes on stats and keep`, async () => {
    const fixedQuery = await correctQueryWithActions(
      'from logstash-* | stats avg(field-1) | keep field-2'
    );
    expect(fixedQuery).toBe('from logstash-* | stats avg(`field-1`) | keep `field-2`');
  });
});
