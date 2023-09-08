/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock, savedObjectsClientMock } from '@kbn/core/server/mocks';

import { getCaseMetrics } from './get_case_metrics';
import { CaseMetricsFeature } from '../../../common/types/api';
import type { CasesClientMock } from '../mocks';
import { createCasesClientMock } from '../mocks';
import type { CasesClientArgs } from '../types';
import { createAuthorizationMock } from '../../authorization/mock';
import {
  createAttachmentServiceMock,
  createCaseServiceMock,
  createUserActionServiceMock,
} from '../../services/mocks';
import { mockAlertsService } from './test_utils/alerts';
import { createStatusChangeSavedObject } from './test_utils/lifespan';
import type { CaseSavedObjectTransformed } from '../../common/types/case';
import { CaseStatuses } from '@kbn/cases-components';
import type { Case } from '../../../common';

describe('getCaseMetrics', () => {
  const inProgressStatusChangeTimestamp = new Date('2021-11-23T20:00:43Z');
  const currentTime = new Date('2021-11-23T20:01:43Z');

  const mockCreateCloseInfo = {
    created_at: '2021-11-23T19:59:43Z',
    closed_at: '2021-11-23T19:59:44Z',
  };

  let client: CasesClientMock;
  let mockServices: ReturnType<typeof createMockClientArgs>['mockServices'];
  let clientArgs: ReturnType<typeof createMockClientArgs>['clientArgs'];

  const openDuration =
    inProgressStatusChangeTimestamp.getTime() - new Date(mockCreateCloseInfo.created_at).getTime();
  const inProgressDuration = currentTime.getTime() - inProgressStatusChangeTimestamp.getTime();

  beforeEach(() => {
    client = createMockClient();
    ({ mockServices, clientArgs } = createMockClientArgs());

    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(currentTime);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns the lifespan metrics', async () => {
    const metrics = await getCaseMetrics(
      { caseId: '', features: [CaseMetricsFeature.LIFESPAN] },
      client,
      clientArgs
    );

    expect(metrics).toEqual({
      lifespan: {
        creationDate: mockCreateCloseInfo.created_at,
        closeDate: mockCreateCloseInfo.closed_at,
        statusInfo: {
          openDuration,
          inProgressDuration,
          reopenDates: [],
        },
      },
    });
  });

  it('populates the alerts.hosts and alerts.users sections', async () => {
    const metrics = await getCaseMetrics(
      { caseId: '', features: [CaseMetricsFeature.ALERTS_HOSTS, CaseMetricsFeature.ALERTS_USERS] },
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
      { caseId: '', features: [CaseMetricsFeature.ALERTS_COUNT, CaseMetricsFeature.LIFESPAN] },
      client,
      clientArgs
    );

    expect(metrics.lifespan).toEqual({
      creationDate: mockCreateCloseInfo.created_at,
      closeDate: mockCreateCloseInfo.closed_at,
      statusInfo: {
        openDuration,
        inProgressDuration,
        reopenDates: [],
      },
    });
    expect(metrics.alerts?.count).toEqual(5);
  });

  it('populates multiple alerts sections at a time', async () => {
    const metrics = await getCaseMetrics(
      { caseId: '', features: [CaseMetricsFeature.ALERTS_COUNT, CaseMetricsFeature.ALERTS_HOSTS] },
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
      // @ts-expect-error: testing invalid features
      getCaseMetrics({ caseId: '', features: ['bananas'] }, client, clientArgs)
    ).rejects.toThrow();
  });

  it('throws an error for an invalid feature among valid features', async () => {
    expect.assertions(1);

    try {
      await getCaseMetrics(
        {
          caseId: '1',
          // @ts-expect-error: testing invalid features
          features: ['bananas', CaseMetricsFeature.LIFESPAN, CaseMetricsFeature.ALERTS_COUNT],
        },
        client,
        clientArgs
      );
    } catch (error) {
      expect(error.message).toMatchInlineSnapshot(
        `"Failed to retrieve metrics within client for case id: 1: Error: Invalid value \\"bananas\\" supplied to \\"features\\""`
      );
    }
  });

  it('calls the alert handler once to compute the metrics for both hosts and users', async () => {
    expect.assertions(1);

    await getCaseMetrics(
      { caseId: '', features: [CaseMetricsFeature.ALERTS_USERS, CaseMetricsFeature.ALERTS_HOSTS] },
      client,
      clientArgs
    );

    expect(mockServices.services.alertsService.executeAggregations).toBeCalledTimes(1);
  });
});

function createMockClient() {
  const client = createCasesClientMock();

  client.cases.get.mockImplementation(async () => {
    return {
      created_at: '2021-11-23T19:59:43Z',
      closed_at: '2021-11-23T19:59:44Z',
    } as unknown as Case;
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

  const soClient = savedObjectsClientMock.create();

  const caseService = createCaseServiceMock();
  caseService.getCase.mockImplementation(async () => {
    return {
      id: '1',
      attributes: {
        owner: 'security',
      },
    } as unknown as CaseSavedObjectTransformed;
  });

  const alertsService = mockAlertsService();

  const logger = loggingSystemMock.createLogger();

  const userActionService = createUserActionServiceMock();
  userActionService.finder.findStatusChanges.mockImplementation(async () => {
    return [
      createStatusChangeSavedObject(CaseStatuses['in-progress'], new Date('2021-11-23T20:00:43Z')),
    ];
  });

  const clientArgs = {
    authorization,
    unsecuredSavedObjectsClient: soClient,
    logger,
    services: {
      caseService,
      attachmentService,
      alertsService,
      userActionService,
    },
  };

  return { mockServices: clientArgs, clientArgs: clientArgs as unknown as CasesClientArgs };
}
