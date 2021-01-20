/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
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
  describe('application', () => {
    test('it returns the application correctly', async () => {
      const res = await api.application({
        externalService,
        params: { id: '123456' },
      });
      expect(res).toEqual({
        id: '987456',
        fields: [
          {
            id: '333333',
            key: 'foo-key',
          },
        ],
      });
    });
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
