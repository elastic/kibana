/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as Lib from '../../lib';

export const mockValidateKibanaPrivileges = jest.fn() as jest.MockedFunction<
  typeof Lib['validateKibanaPrivileges']
>;

jest.mock('../../lib', () => {
  const actual = jest.requireActual('../../lib');
  return {
    ...actual,
    validateKibanaPrivileges: mockValidateKibanaPrivileges,
  };
});
