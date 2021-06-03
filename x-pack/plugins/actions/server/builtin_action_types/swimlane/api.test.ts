/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { api } from './api';
import { ExternalService } from './types';
import { externalServiceMock, recordResponseCreate, recordResponseUpdate } from './mocks';
import { Logger } from '@kbn/logging';

let mockedLogger: jest.Mocked<Logger>;
const params = {
  ruleName: 'rule name',
  alertId: '123456',
  caseName: 'case name',
  severity: 'critical',
  alertSource: 'elastic',
  caseId: '123456',
  comments: 'some comments',
  description: 'case desc',
};

describe('api', () => {
  let externalService: jest.Mocked<ExternalService>;

  beforeEach(() => {
    externalService = externalServiceMock.create();
  });

  describe('pushToService', () => {
    test('it pushes a new record', async () => {
      const res = await api.pushToService({
        externalService,
        logger: mockedLogger,
        params: {
          incident: {
            ...params,
            externalId: null,
          },
          comments: [],
        },
      });
      expect(externalService.createComment).not.toHaveBeenCalled();
      expect(externalService.createRecord).toHaveBeenCalled();
      expect(externalService.updateRecord).not.toHaveBeenCalled();
      expect(res).toEqual(recordResponseCreate);
    });

    test('it pushes a new record with a comment', async () => {
      await api.pushToService({
        externalService,
        logger: mockedLogger,
        params: {
          incident: {
            ...params,
            externalId: null,
          },
          comments: [{ comment: 'some comments', commentId: '123' }],
        },
      });
      expect(externalService.createComment).toHaveBeenCalled();
    });

    test('updates existing record', async () => {
      const res = await api.pushToService({
        externalService,
        logger: mockedLogger,
        params: {
          incident: {
            ...params,
            externalId: '1234',
          },
          comments: [{ comment: 'some comments', commentId: '123' }],
        },
      });

      expect(externalService.createComment).toHaveBeenCalled();
      expect(externalService.createRecord).not.toHaveBeenCalled();
      expect(externalService.updateRecord).toHaveBeenCalled();
      expect(res).toEqual(recordResponseUpdate);
    });
  });
});
