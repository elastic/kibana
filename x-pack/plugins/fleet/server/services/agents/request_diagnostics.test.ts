/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { appContextService } from '../app_context';
import { createAppContextStartContractMock } from '../../mocks';

import { createClientMock } from './action.mock';
import { bulkRequestDiagnostics, requestDiagnostics } from './request_diagnostics';

describe('requestDiagnostics (singular)', () => {
  it('can request diagnostics for single agent', async () => {
    const { esClient, agentInRegularDoc } = createClientMock();
    await requestDiagnostics(esClient, agentInRegularDoc._id);

    expect(esClient.create).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({
          agents: ['agent-in-regular-policy'],
          type: 'REQUEST_DIAGNOSTICS',
        }),
        index: '.fleet-actions',
      })
    );
  });
});

describe('requestDiagnostics (plural)', () => {
  beforeEach(async () => {
    appContextService.start(createAppContextStartContractMock());
  });

  afterEach(() => {
    appContextService.stop();
  });
  it('can request diagnostics for multiple agents', async () => {
    const { soClient, esClient, agentInRegularDoc, agentInRegularDoc2 } = createClientMock();
    const idsToUnenroll = [agentInRegularDoc._id, agentInRegularDoc2._id];
    await bulkRequestDiagnostics(esClient, soClient, { agentIds: idsToUnenroll });

    expect(esClient.create).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({
          agents: ['agent-in-regular-policy', 'agent-in-regular-policy2'],
          type: 'REQUEST_DIAGNOSTICS',
        }),
        index: '.fleet-actions',
      })
    );
  });
});
