/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AlertTypeRegistry } from './alert_type_registry';

type Schema = PublicMethodsOf<AlertTypeRegistry>;

const createAlertTypeRegistryMock = () => {
  const mocked: jest.Mocked<Schema> = {
    has: jest.fn(),
    register: jest.fn(),
    get: jest.fn(),
    list: jest.fn(),
  };
  return mocked;
};

export const alertTypeRegistryMock = {
  create: createAlertTypeRegistryMock,
};
