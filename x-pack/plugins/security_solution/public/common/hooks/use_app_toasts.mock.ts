/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const createAppToastsMock = () => ({
  addError: jest.fn(),
  addSuccess: jest.fn(),
});

export const useAppToastsMock = {
  create: createAppToastsMock,
};
