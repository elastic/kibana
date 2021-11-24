/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getMetrics } from './index';
import { CaseAttributes, CaseResponse } from '../../../../common';
import { createCasesClientMock } from '../../mocks';
import { CasesClientArgs } from '../../types';
import { createAuthorizationMock } from '../../../authorization/mock';
import {
  loggingSystemMock,
  savedObjectsClientMock,
} from '../../../../../../../src/core/server/mocks';
import { createCaseServiceMock } from '../../../services/mocks';
import { SavedObject } from 'kibana/server';

describe('getMetrics', () => {
  const mockCreateCloseInfo = {
    created_at: '2021-11-23T19:59:43Z',
    closed_at: '2021-11-23T19:59:44Z',
  };

  const client = createCasesClientMock();
  client.cases.get.mockImplementation(async () => {
    return {
      created_at: '2021-11-23T19:59:43Z',
      closed_at: '2021-11-23T19:59:44Z',
    } as unknown as CaseResponse;
  });

  const authorization = createAuthorizationMock();
  const soClient = savedObjectsClientMock.create();
  const caseService = createCaseServiceMock();
  caseService.getCase.mockImplementation(async () => {
    return {
      id: '1',
      attributes: {
        owner: 'security',
      },
    } as unknown as SavedObject<CaseAttributes>;
  });

  const logger = loggingSystemMock.createLogger();

  const clientArgs = {
    authorization,
    unsecuredSavedObjectsClient: soClient,
    caseService,
    logger,
  } as unknown as CasesClientArgs;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the lifespan metrics', async () => {
    const metrics = await getMetrics({ caseId: '', features: ['lifespan'] }, client, clientArgs);

    expect(metrics).toEqual({
      lifespan: {
        creationDate: mockCreateCloseInfo.created_at,
        closeDate: mockCreateCloseInfo.closed_at,
      },
    });
  });

  it('populates the alertHosts and alertUsers sections', async () => {
    const metrics = await getMetrics({ caseId: '', features: ['alertHosts'] }, client, clientArgs);

    expect(metrics.alertHosts).toBeDefined();
    expect(metrics.alertUsers).toBeDefined();
  });

  it('populates multiple sections at a time', async () => {
    const metrics = await getMetrics(
      { caseId: '', features: ['alertsCount', 'lifespan'] },
      client,
      clientArgs
    );

    expect(metrics.lifespan).toEqual({
      creationDate: mockCreateCloseInfo.created_at,
      closeDate: mockCreateCloseInfo.closed_at,
    });
    expect(metrics.alertsCount).toBeDefined();
  });

  it('throws an error for an invalid feature', async () => {
    expect.assertions(1);

    await expect(
      getMetrics({ caseId: '', features: ['bananas'] }, client, clientArgs)
    ).rejects.toThrow();
  });

  it('throws an error for an invalid feature among valid features', async () => {
    expect.assertions(1);

    try {
      await getMetrics(
        { caseId: '', features: ['bananas', 'lifespan', 'alertsCount'] },
        client,
        clientArgs
      );
    } catch (error) {
      expect(error.message).toContain('invalid features: [bananas]');
    }
  });
});
