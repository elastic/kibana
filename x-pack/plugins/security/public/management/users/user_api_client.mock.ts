/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const userAPIClientMock = {
  create: () => ({
    getUsers: jest.fn(),
    getUser: jest.fn(),
    deleteUser: jest.fn(),
    enableUser: jest.fn(),
    disableUser: jest.fn(),
    saveUser: jest.fn(),
    changePassword: jest.fn(),
  }),
};
