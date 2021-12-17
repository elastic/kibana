/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createCasesClientMock } from '../mocks';
import { CasesClientArgs } from '../types';
import { loggingSystemMock } from '../../../../../../src/core/server/mocks';
import { createAttachmentServiceMock } from '../../services/mocks';

import { Actions } from './actions';
import { ICaseResponse } from '../typedoc_interfaces';

const clientMock = createCasesClientMock();
const attachmentService = createAttachmentServiceMock();

const logger = loggingSystemMock.createLogger();
const getAuthorizationFilter = jest.fn().mockResolvedValue({});

const clientArgs = {
  logger,
  attachmentService,
  authorization: { getAuthorizationFilter },
} as unknown as CasesClientArgs;

describe('Actions', () => {
  beforeAll(() => {
    getAuthorizationFilter.mockResolvedValue({});
    clientMock.cases.get.mockResolvedValue({ id: '' } as unknown as ICaseResponse);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns zero values when count returns undefined', async () => {
    attachmentService.countActionsAttachedToCase.mockResolvedValue(undefined);

    const handler = new Actions('', clientMock, clientArgs);

    expect(await handler.compute()).toEqual({
      actions: {
        isolateHost: {
          isolate: { total: 0 },
          unisolate: { total: 0 },
        },
      },
    });
  });

  it('returns zero values when there are no actions', async () => {
    attachmentService.countActionsAttachedToCase.mockResolvedValue({});

    const handler = new Actions('', clientMock, clientArgs);

    expect(await handler.compute()).toEqual({
      actions: {
        isolateHost: {
          isolate: { total: 0 },
          unisolate: { total: 0 },
        },
      },
    });
  });

  it('returns values when there are actions', async () => {
    const counters = { isolate: 3, unisolate: 5 };
    attachmentService.countActionsAttachedToCase.mockResolvedValue(counters);

    const handler = new Actions('', clientMock, clientArgs);

    expect(await handler.compute()).toEqual({
      actions: {
        isolateHost: {
          isolate: { total: counters.isolate },
          unisolate: { total: counters.unisolate },
        },
      },
    });
  });
});
