/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { api } from './api';
import { ExternalService } from './types';
import { externalServiceMock } from './mocks';
import { Logger } from '@kbn/logging';
let mockedLogger: jest.Mocked<Logger>;

describe('api', () => {
  let externalService: jest.Mocked<ExternalService>;

  beforeEach(() => {
    externalService = externalServiceMock.create();
  });

  describe('createRecord', () => {
    test('it creates a record correctly', async () => {
      const res = await api.createRecord({
        externalService,
        logger: mockedLogger,
        params: {
          alertName: 'alert name',
          caseName: 'case name',
          severity: 'critical',
          alertSource: 'elastic',
          caseId: '123456',
          comments: 'some comments',
        },
      });
      expect(res).toEqual({
        id: '123456',
      });
    });
  });
});
