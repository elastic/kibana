/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// NOTE: We'll be able to use the generic mock once https://github.com/elastic/kibana/pull/36829 is merged

const createSavedObjectsClient = () => ({
  errors: {} as any,
  bulkCreate: jest.fn(),
  bulkGet: jest.fn(),
  create: jest.fn(),
  delete: jest.fn(),
  find: jest.fn(),
  get: jest.fn(),
  update: jest.fn(),
});

export const savedObjectsClientMock = {
  create: createSavedObjectsClient,
};
