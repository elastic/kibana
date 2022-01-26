/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CaseResponse } from '../../../../common/api';
import { createCasesClientMock } from '../../mocks';
import { CasesClientArgs } from '../../types';
import { loggingSystemMock } from '../../../../../../../src/core/server/mocks';
import { createAttachmentServiceMock } from '../../../services/mocks';

import { Actions } from './actions';

const clientMock = createCasesClientMock();
const attachmentService = createAttachmentServiceMock();

const logger = loggingSystemMock.createLogger();
const getAuthorizationFilter = jest.fn().mockResolvedValue({});

const clientArgs = {
  logger,
  attachmentService,
  authorization: { getAuthorizationFilter },
} as unknown as CasesClientArgs;

const constructorOptions = { caseId: 'test-id', casesClient: clientMock, clientArgs };

describe('Actions', () => {
  beforeAll(() => {
    getAuthorizationFilter.mockResolvedValue({});
    clientMock.cases.get.mockResolvedValue({ id: '' } as unknown as CaseResponse);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns empty values when no features set up', async () => {
    attachmentService.executeCaseActionsAggregations.mockResolvedValue(undefined);
    const handler = new Actions(constructorOptions);
    expect(await handler.compute()).toEqual({});
  });

  it('returns zero values when aggregation returns undefined', async () => {
    attachmentService.executeCaseActionsAggregations.mockResolvedValue(undefined);

    const handler = new Actions(constructorOptions);
    handler.setupFeature('actions.isolateHost');

    expect(await handler.compute()).toEqual({
      actions: {
        isolateHost: {
          isolate: { total: 0 },
          unisolate: { total: 0 },
        },
      },
    });
  });

  it('returns zero values when aggregation returns empty object', async () => {
    attachmentService.executeCaseActionsAggregations.mockResolvedValue({});

    const handler = new Actions(constructorOptions);
    handler.setupFeature('actions.isolateHost');

    expect(await handler.compute()).toEqual({
      actions: {
        isolateHost: {
          isolate: { total: 0 },
          unisolate: { total: 0 },
        },
      },
    });
  });

  it('returns zero values when aggregation returns empty actions object', async () => {
    attachmentService.executeCaseActionsAggregations.mockResolvedValue({
      actions: { buckets: [] },
    });

    const handler = new Actions(constructorOptions);
    handler.setupFeature('actions.isolateHost');

    expect(await handler.compute()).toEqual({
      actions: {
        isolateHost: {
          isolate: { total: 0 },
          unisolate: { total: 0 },
        },
      },
    });
  });

  it('returns zero values when there are no isolateHost actions', async () => {
    attachmentService.executeCaseActionsAggregations.mockResolvedValue({
      actions: { buckets: [{ key: 'otherAction', doc_count: 10 }] },
    });

    const handler = new Actions(constructorOptions);
    handler.setupFeature('actions.isolateHost');

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
    attachmentService.executeCaseActionsAggregations.mockResolvedValue({
      actions: {
        buckets: Object.entries(counters).map(([key, total]) => ({ key, doc_count: total })),
      },
    });

    const handler = new Actions(constructorOptions);
    handler.setupFeature('actions.isolateHost');

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
