/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { querySchema, bodySchema, idConditionalValidation } from './file_upload';

const queryWithId = {
  id: '123',
};

const bodyWithoutQueryId = {
  index: 'islandofone',
  data: [],
  settings: { number_of_shards: 1 },
  mappings: { coordinates: { type: 'geo_point' } },
  ingestPipeline: {},
  fileType: 'json',
  app: 'Maps',
};

const bodyWithQueryId = {
  index: 'islandofone2',
  data: [{ coordinates: [], name: 'islandofone2' }],
  settings: {},
  mappings: {},
  ingestPipeline: {},
  fileType: 'json',
};

describe('route validation', () => {
  it(`validates query with id`, async () => {
    const validationResult = querySchema.validate(queryWithId);
    expect(validationResult.id).toBe(queryWithId.id);
  });

  it(`validates query without id`, async () => {
    const validationResult = querySchema.validate({});
    expect(validationResult.id).toBeNull();
  });

  it(`throws when query contains content other than an id`, async () => {
    expect(() => querySchema.validate({ notAnId: 123 })).toThrowError(
      `[notAnId]: definition for this key is missing`
    );
  });

  it(`validates body with valid fields`, async () => {
    const validationResult = bodySchema.validate(bodyWithoutQueryId);
    expect(validationResult).toEqual(bodyWithoutQueryId);
  });

  it(`throws if an expected field is missing`, async () => {
    /* eslint-disable no-unused-vars */
    const { index, ...bodyWithoutIndexField } = bodyWithoutQueryId;
    expect(() => bodySchema.validate(bodyWithoutIndexField)).toThrowError(
      `[index]: expected value of type [string] but got [undefined]`
    );
  });

  it(`validates conditional fields when id has been provided in query`, async () => {
    const validationResult = idConditionalValidation(bodyWithQueryId, true);
    expect(validationResult).toEqual(bodyWithQueryId);
  });

  it(`validates conditional fields when no id has been provided in query`, async () => {
    const validationResultWhenIdPresent = idConditionalValidation(bodyWithoutQueryId, false);
    expect(validationResultWhenIdPresent).toEqual(bodyWithoutQueryId);
    // Conditions for no id are more strict since this query sets up the index,
    // expect it to throw if expected fields aren't present
    expect(() => idConditionalValidation(bodyWithoutQueryId, true)).toThrowError(
      `[data]: array size is [0], but cannot be smaller than [1]`
    );
  });
});
