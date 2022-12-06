/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CaseResponse } from '../../../../common/api';
import { createCasesClientMock } from '../../mocks';
import type { CasesClientArgs } from '../../types';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { createAttachmentServiceMock } from '../../../services/mocks';

import { AlertsCount } from './count';

const clientMock = createCasesClientMock();
const attachmentService = createAttachmentServiceMock();

const logger = loggingSystemMock.createLogger();
const getAuthorizationFilter = jest.fn().mockResolvedValue({});

const clientArgs = {
  logger,
  services: {
    attachmentService,
  },
  authorization: { getAuthorizationFilter },
} as unknown as CasesClientArgs;

const constructorOptions = { caseId: 'test-id', casesClient: clientMock, clientArgs };

describe('AlertsCount', () => {
  beforeAll(() => {
    getAuthorizationFilter.mockResolvedValue({});
    clientMock.cases.get.mockResolvedValue({ id: 'test-id' } as unknown as CaseResponse);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns empty values when attachment services returns undefined', async () => {
    attachmentService.countAlertsAttachedToCase.mockResolvedValue(undefined);
    const handler = new AlertsCount(constructorOptions);
    expect(await handler.compute()).toEqual({ alerts: { count: 0 } });
  });

  it('returns values when the attachment service returns a value', async () => {
    attachmentService.countAlertsAttachedToCase.mockResolvedValue(5);
    const handler = new AlertsCount(constructorOptions);

    expect(await handler.compute()).toEqual({ alerts: { count: 5 } });
  });
});
