/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import { appContextService } from '../app_context';
import { createAppContextStartContractMock } from '../../mocks';

import { createClientMock } from './action.mock';
import { bulkRequestDiagnostics, requestDiagnostics } from './request_diagnostics';

describe('requestDiagnostics', () => {
  beforeEach(async () => {
    const { soClient } = createClientMock();
    appContextService.start(
      createAppContextStartContractMock({}, false, {
        withoutSpaceExtensions: soClient,
      })
    );
  });

  afterEach(() => {
    appContextService.stop();
  });

  describe('requestDiagnostics (singular)', () => {
    it('can request diagnostics for single agent', async () => {
      const { soClient, esClient, agentInRegularDoc } = createClientMock();
      await requestDiagnostics(esClient, soClient, agentInRegularDoc._id);

      expect(esClient.create).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({
            agents: ['agent-in-regular-policy'],
            type: 'REQUEST_DIAGNOSTICS',
            expiration: expect.anything(),
          }),
          index: '.fleet-actions',
        })
      );
    });
  });

  describe('requestDiagnostics (plural)', () => {
    it('can request diagnostics for multiple agents', async () => {
      const { soClient, esClient, agentInRegularDocNewer, agentInRegularDocNewer2 } =
        createClientMock();
      const idsToAction = [agentInRegularDocNewer._id, agentInRegularDocNewer2._id];
      await bulkRequestDiagnostics(esClient, soClient, { agentIds: idsToAction });

      expect(esClient.create).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({
            agents: ['agent-in-regular-policy-newer', 'agent-in-regular-policy-newer2'],
            type: 'REQUEST_DIAGNOSTICS',
            expiration: expect.anything(),
          }),
          index: '.fleet-actions',
        })
      );
    });

    it('should report error when diagnostics for older agent', async () => {
      const { soClient, esClient, agentInRegularDoc, agentInRegularDocNewer } = createClientMock();
      const idsToAction = [agentInRegularDocNewer._id, agentInRegularDoc._id];
      await bulkRequestDiagnostics(esClient, soClient, { agentIds: idsToAction });

      expect(esClient.create).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({
            agents: ['agent-in-regular-policy-newer', 'agent-in-regular-policy'],
            type: 'REQUEST_DIAGNOSTICS',
            expiration: expect.anything(),
          }),
          index: '.fleet-actions',
        })
      );
      const calledWithActionResults = esClient.bulk.mock.calls[0][0] as estypes.BulkRequest;
      // bulk write two line per create
      expect(calledWithActionResults.body?.length).toBe(2);
      const expectedObject = expect.objectContaining({
        '@timestamp': expect.anything(),
        action_id: expect.anything(),
        agent_id: 'agent-in-regular-policy',
        error: 'Agent agent-in-regular-policy does not support request diagnostics action.',
      });
      expect(calledWithActionResults.body?.[1] as any).toEqual(expectedObject);
    });
  });
});
