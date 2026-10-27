/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSourceRequestSchema, updateSourceRequestSchema } from './schema';

const createBody = { title: 'Nginx errors', esql: 'FROM logs-nginx-*' };
const updateBody = { ...createBody, tags: [] };

describe('onboard_immediately', () => {
  it.each([
    ['create', createSourceRequestSchema, createBody],
    ['update', updateSourceRequestSchema, updateBody],
  ])('defaults to true on %s', (_, schema, body) => {
    expect(schema.parse(body).onboard_immediately).toBe(true);
  });

  it.each([
    ['create', createSourceRequestSchema, createBody],
    ['update', updateSourceRequestSchema, updateBody],
  ])('keeps an explicit false on %s', (_, schema, body) => {
    expect(schema.parse({ ...body, onboard_immediately: false }).onboard_immediately).toBe(false);
  });

  it.each([
    ['create', createSourceRequestSchema, createBody],
    ['update', updateSourceRequestSchema, updateBody],
  ])('rejects a value that is not a boolean on %s', (_, schema, body) => {
    expect(schema.safeParse({ ...body, onboard_immediately: 'no' }).success).toBe(false);
  });
});
