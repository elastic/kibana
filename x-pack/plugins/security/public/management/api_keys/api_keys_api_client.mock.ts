/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const apiKeysAPIClientMock = {
  create: () => ({
    checkPrivileges: jest.fn(),
    getApiKeys: jest.fn(),
    invalidateApiKeys: jest.fn(),
  }),
};
