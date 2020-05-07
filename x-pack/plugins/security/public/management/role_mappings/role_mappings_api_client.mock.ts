/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const roleMappingsAPIClientMock = {
  create: () => ({
    checkRoleMappingFeatures: jest.fn(),
    getRoleMappings: jest.fn(),
    getRoleMapping: jest.fn(),
    saveRoleMapping: jest.fn(),
    deleteRoleMappings: jest.fn(),
  }),
};
