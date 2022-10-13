/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core/public/mocks';

export const mockHttpValues = {
  http: httpServiceMock.createSetupContract(),
  errorConnectingMessage: '',
  readOnlyMode: false,
};

jest.mock('../../shared/http', () => ({
  HttpLogic: { values: mockHttpValues },
}));
