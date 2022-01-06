/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getCaseMetrics } from './get_case_metrics';
import { CaseAttributes, CaseResponse } from '../../../common/api';
import { createCasesClientMock } from '../mocks';
import { CasesClientArgs } from '../types';
import { createAuthorizationMock } from '../../authorization/mock';
import { loggingSystemMock, savedObjectsClientMock } from '../../../../../../src/core/server/mocks';
import { createAttachmentServiceMock, createCaseServiceMock } from '../../services/mocks';
import { SavedObject } from 'kibana/server';
import { mockAlertsService } from './alerts/test_utils';

describe('getMetrics', () => {
  const mockCreateCloseInfo = {
    created_at: '2021-11-23T19:59:43Z',
    closed_at: '2021-11-23T19:59:44Z',
  };

  const client = createMockClient();
  const { mockServices, clientArgs } = createMockClientArgs();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the lifespan metrics', async () => {
    const metrics = await getCaseMetrics(
      { caseId: '', features: ['lifespan'] },
      client,
      clientArgs
    );

    expect(metrics).toEqual({
      lifespan: {
        creationDate: mockCreateCloseInfo.created_at,
        closeDate: mockCreateCloseInfo.closed_at,
      },
    });
  });

  it('populates the alerts.hosts and alerts.users sections', async () => {
    const metrics = await getCaseMetrics(
      { caseId: '', features: ['alerts.hosts', 'alerts.users'] },
      client,
      clientArgs
    );

    expect(metrics.alerts?.hosts).toEqual({
      total: 2,
      values: [{ name: 'host1', id: '1', count: 1 }],
    });
    expect(metrics.alerts?.users).toEqual({ total: 2, values: [{ count: 1, name: 'user1' }] });
  });

  it('populates multiple sections at a time', async () => {
    const metrics = await getCaseMetrics(
      { caseId: '', features: ['alerts.count', 'lifespan'] },
      client,
      clientArgs
    );

    expect(metrics.lifespan).toEqual({
      creationDate: mockCreateCloseInfo.created_at,
      closeDate: mockCreateCloseInfo.closed_at,
    });
    expect(metrics.alerts?.count).toEqual(5);
  });

  it('populates multiple alerts sections at a time', async () => {
    const metrics = await getCaseMetrics(
      { caseId: '', features: ['alerts.count', 'alerts.hosts'] },
      client,
      clientArgs
    );

    expect(metrics.alerts?.count).toEqual(5);
    expect(metrics.alerts?.hosts).toEqual({
      total: 2,
      values: [{ name: 'host1', id: '1', count: 1 }],
    });
  });

  it('throws an error for an invalid feature', async () => {
    expect.assertions(1);

    await expect(
      getCaseMetrics({ caseId: '', features: ['bananas'] }, client, clientArgs)
    ).rejects.toThrow();
  });

  it('throws an error for an invalid feature among valid features', async () => {
    expect.assertions(1);

    try {
      await getCaseMetrics(
        { caseId: '1', features: ['bananas', 'lifespan', 'alerts.count'] },
        client,
        clientArgs
      );
    } catch (error) {
      expect(error.message).toMatchInlineSnapshot(
        `"Failed to retrieve metrics within client for case id: 1: Error: invalid features: [bananas], please only provide valid features: [actions.isolateHost, alerts.count, alerts.hosts, alerts.users, connectors, lifespan]"`
      );
    }
  });

  it('calls the alert handler once to compute the metrics for both hosts and users', async () => {
    expect.assertions(1);

    await getCaseMetrics(
      { caseId: '', features: ['alerts.users', 'alerts.hosts'] },
      client,
      clientArgs
    );

    expect(mockServices.alertsService.executeAggregations).toBeCalledTimes(1);
  });
});

function createMockClient() {
  const client = createCasesClientMock();

  client.cases.get.mockImplementation(async () => {
    return {
      created_at: '2021-11-23T19:59:43Z',
      closed_at: '2021-11-23T19:59:44Z',
    } as unknown as CaseResponse;
  });

  client.attachments.getAllAlertsAttachToCase.mockImplementation(async () => {
    return [{ id: '1', index: '2', attached_at: '3' }];
  });

  return client;
}

function createMockClientArgs() {
  const attachmentService = createAttachmentServiceMock();
  attachmentService.countAlertsAttachedToCase.mockImplementation(async () => {
    return 5;
  });

  const authorization = createAuthorizationMock();
  authorization.getAuthorizationFilter.mockImplementation(async () => {
    return { filter: undefined, ensureSavedObjectsAreAuthorized: () => {} };
  });

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

  const alertsService = mockAlertsService();

  const logger = loggingSystemMock.createLogger();

  const clientArgs = {
    authorization,
    unsecuredSavedObjectsClient: soClient,
    caseService,
    logger,
    attachmentService,
    alertsService,
  };

  return { mockServices: clientArgs, clientArgs: clientArgs as unknown as CasesClientArgs };
}
