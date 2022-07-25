/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsRepositoryMock, savedObjectsServiceMock } from '@kbn/core/server/mocks';
import { RuleExecutionStatusErrorReasons, HealthStatus } from '../types';
import { getAlertingHealthStatus, getHealth } from './get_health';

const savedObjectsRepository = savedObjectsRepositoryMock.create();

describe('getHealth()', () => {
  test('return true if some rules has a decryption error', async () => {
    const lastExecutionDateError = new Date().toISOString();
    const lastExecutionDate = new Date().toISOString();
    savedObjectsRepository.find.mockResolvedValueOnce({
      total: 1,
      per_page: 1,
      page: 1,
      saved_objects: [
        {
          id: '1',
          type: 'alert',
          attributes: {
            alertTypeId: 'myType',
            schedule: { interval: '10s' },
            params: {
              bar: true,
            },
            createdAt: new Date().toISOString(),
            actions: [
              {
                group: 'default',
                actionRef: 'action_0',
                params: {
                  foo: true,
                },
              },
            ],
            executionStatus: {
              status: 'error',
              lastExecutionDate: lastExecutionDateError,
              error: {
                reason: RuleExecutionStatusErrorReasons.Decrypt,
                message: 'Failed decrypt',
              },
            },
          },
          score: 1,
          references: [
            {
              name: 'action_0',
              type: 'action',
              id: '1',
            },
          ],
        },
      ],
    });
    savedObjectsRepository.find.mockResolvedValueOnce({
      total: 0,
      per_page: 10,
      page: 1,
      saved_objects: [],
    });

    savedObjectsRepository.find.mockResolvedValueOnce({
      total: 0,
      per_page: 10,
      page: 1,
      saved_objects: [],
    });

    savedObjectsRepository.find.mockResolvedValueOnce({
      total: 1,
      per_page: 1,
      page: 1,
      saved_objects: [
        {
          id: '2',
          type: 'alert',
          attributes: {
            alertTypeId: 'myType',
            schedule: { interval: '1s' },
            params: {
              bar: true,
            },
            createdAt: new Date().toISOString(),
            actions: [],
            executionStatus: {
              status: 'ok',
              lastExecutionDate,
            },
          },
          score: 1,
          references: [],
        },
      ],
    });
    const result = await getHealth(savedObjectsRepository);
    expect(result).toStrictEqual({
      executionHealth: {
        status: HealthStatus.OK,
        timestamp: lastExecutionDate,
      },
      readHealth: {
        status: HealthStatus.OK,
        timestamp: lastExecutionDate,
      },
      decryptionHealth: {
        status: HealthStatus.Warning,
        timestamp: lastExecutionDateError,
      },
    });
    expect(savedObjectsRepository.find).toHaveBeenCalledTimes(4);
  });

  test('return false if no rules with a decryption error', async () => {
    const lastExecutionDateError = new Date().toISOString();
    const lastExecutionDate = new Date().toISOString();
    savedObjectsRepository.find.mockResolvedValueOnce({
      total: 0,
      per_page: 10,
      page: 1,
      saved_objects: [],
    });

    savedObjectsRepository.find.mockResolvedValueOnce({
      total: 1,
      per_page: 1,
      page: 1,
      saved_objects: [
        {
          id: '1',
          type: 'alert',
          attributes: {
            alertTypeId: 'myType',
            schedule: { interval: '10s' },
            params: {
              bar: true,
            },
            createdAt: new Date().toISOString(),
            actions: [
              {
                group: 'default',
                actionRef: 'action_0',
                params: {
                  foo: true,
                },
              },
            ],
            executionStatus: {
              status: 'error',
              lastExecutionDate: lastExecutionDateError,
              error: {
                reason: RuleExecutionStatusErrorReasons.Execute,
                message: 'Failed',
              },
            },
          },
          score: 1,
          references: [
            {
              name: 'action_0',
              type: 'action',
              id: '1',
            },
          ],
        },
      ],
    });
    savedObjectsRepository.find.mockResolvedValueOnce({
      total: 0,
      per_page: 10,
      page: 1,
      saved_objects: [],
    });

    savedObjectsRepository.find.mockResolvedValueOnce({
      total: 1,
      per_page: 1,
      page: 1,
      saved_objects: [
        {
          id: '2',
          type: 'alert',
          attributes: {
            alertTypeId: 'myType',
            schedule: { interval: '1s' },
            params: {
              bar: true,
            },
            createdAt: new Date().toISOString(),
            actions: [],
            executionStatus: {
              status: 'ok',
              lastExecutionDate,
            },
          },
          score: 1,
          references: [],
        },
      ],
    });
    const result = await getHealth(savedObjectsRepository);
    expect(result).toStrictEqual({
      executionHealth: {
        status: HealthStatus.Warning,
        timestamp: lastExecutionDateError,
      },
      readHealth: {
        status: HealthStatus.OK,
        timestamp: lastExecutionDate,
      },
      decryptionHealth: {
        status: HealthStatus.OK,
        timestamp: lastExecutionDate,
      },
    });
  });
});

describe('getAlertingHealthStatus()', () => {
  test('return the proper framework state if some rules has a decryption error', async () => {
    const savedObjects = savedObjectsServiceMock.createStartContract();
    const lastExecutionDateError = new Date().toISOString();
    savedObjectsRepository.find.mockResolvedValueOnce({
      total: 1,
      per_page: 1,
      page: 1,
      saved_objects: [
        {
          id: '1',
          type: 'alert',
          attributes: {
            alertTypeId: 'myType',
            schedule: { interval: '10s' },
            params: {
              bar: true,
            },
            createdAt: new Date().toISOString(),
            actions: [
              {
                group: 'default',
                actionRef: 'action_0',
                params: {
                  foo: true,
                },
              },
            ],
            executionStatus: {
              status: 'error',
              lastExecutionDate: lastExecutionDateError,
              error: {
                reason: RuleExecutionStatusErrorReasons.Decrypt,
                message: 'Failed decrypt',
              },
            },
          },
          score: 1,
          references: [
            {
              name: 'action_0',
              type: 'action',
              id: '1',
            },
          ],
        },
      ],
    });
    savedObjectsRepository.find.mockResolvedValue({
      total: 0,
      per_page: 10,
      page: 1,
      saved_objects: [],
    });
    const result = await getAlertingHealthStatus(
      { ...savedObjects, createInternalRepository: () => savedObjectsRepository },
      1
    );
    expect(result).toStrictEqual({
      state: {
        runs: 2,
        health_status: HealthStatus.Warning,
      },
    });
  });
});
