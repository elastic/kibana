/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { httpServiceMock } from 'src/core/public/mocks';

export const mockHttpValues = {
  http: httpServiceMock.createSetupContract(),
  errorConnecting: false,
  readOnlyMode: false,
};

jest.mock('../shared/http', () => ({
  HttpLogic: { values: mockHttpValues },
}));
