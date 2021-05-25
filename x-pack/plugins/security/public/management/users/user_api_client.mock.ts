/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
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
