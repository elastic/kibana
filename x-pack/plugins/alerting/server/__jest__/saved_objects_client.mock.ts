/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

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
