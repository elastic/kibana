/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CaseResponse } from '../../../../common/api';
import { createCasesClientMock } from '../../mocks';
import { CasesClientArgs } from '../../types';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { createCaseServiceMock } from '../../../services/mocks';

import { MTTR } from './mttr';

const clientMock = createCasesClientMock();
const caseService = createCaseServiceMock();

const logger = loggingSystemMock.createLogger();
const getAuthorizationFilter = jest.fn().mockResolvedValue({});

const clientArgs = {
  logger,
  caseService,
  authorization: { getAuthorizationFilter },
} as unknown as CasesClientArgs;

const constructorOptions = { casesClient: clientMock, clientArgs };

describe('MTTR', () => {
  beforeAll(() => {
    getAuthorizationFilter.mockResolvedValue({});
    clientMock.cases.get.mockResolvedValue({ id: '' } as unknown as CaseResponse);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns empty values when no features set up', async () => {
    caseService.executeAggregations.mockResolvedValue(undefined);
    const handler = new MTTR(constructorOptions);
    expect(await handler.compute()).toEqual({});
  });

  it('returns zero values when aggregation returns undefined', async () => {
    caseService.executeAggregations.mockResolvedValue(undefined);
    const handler = new MTTR(constructorOptions);
    handler.setupFeature('mttr');

    expect(await handler.compute()).toEqual({ mttr: 0 });
  });

  it('returns zero values when aggregation returns empty object', async () => {
    caseService.executeAggregations.mockResolvedValue({});
    const handler = new MTTR(constructorOptions);
    handler.setupFeature('mttr');

    expect(await handler.compute()).toEqual({ mttr: 0 });
  });

  it('returns zero values when aggregation returns empty mttr object', async () => {
    caseService.executeAggregations.mockResolvedValue({ mttr: {} });
    const handler = new MTTR(constructorOptions);
    handler.setupFeature('mttr');

    expect(await handler.compute()).toEqual({ mttr: 0 });
  });

  it('returns values when there is a mttr value', async () => {
    caseService.executeAggregations.mockResolvedValue({ mttr: { value: 5 } });
    const handler = new MTTR(constructorOptions);
    handler.setupFeature('mttr');

    expect(await handler.compute()).toEqual({ mttr: 5 });
  });
});
