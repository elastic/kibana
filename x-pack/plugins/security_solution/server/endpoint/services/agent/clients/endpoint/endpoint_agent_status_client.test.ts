/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentStatusClientOptions } from '../lib/base_agent_status_client';
import type { ApplyMetadataMocksResponse } from '../../../metadata/mocks';
import { createEndpointMetadataServiceTestContextMock } from '../../../metadata/mocks';
import { EndpointAgentStatusClient } from '../../..';
import { getPendingActionsSummary as _getPendingActionsSummary } from '../../../actions/pending_actions_summary';
import { createMockEndpointAppContextService } from '../../../../mocks';
import { appContextService as fleetAppContextService } from '@kbn/fleet-plugin/server/services';
import { createAppContextStartContractMock as fleetCreateAppContextStartContractMock } from '@kbn/fleet-plugin/server/mocks';

jest.mock('../../../actions/pending_actions_summary', () => {
  const realModule = jest.requireActual('../../../actions/pending_actions_summary');
  return {
    ...realModule,
    getPendingActionsSummary: jest.fn(realModule.getPendingActionsSummary),
  };
});

const getPendingActionsSummaryMock = _getPendingActionsSummary as jest.Mock;

describe('EndpointAgentStatusClient', () => {
  let constructorOptions: AgentStatusClientOptions;
  let statusClient: EndpointAgentStatusClient;
  let dataMocks: ApplyMetadataMocksResponse;

  beforeEach(() => {
    const endpointAppContextServiceMock = createMockEndpointAppContextService();
    const metadataMocks = createEndpointMetadataServiceTestContextMock();
    const soClient = endpointAppContextServiceMock.savedObjects.createInternalScopedSoClient({
      readonly: false,
    });

    dataMocks = metadataMocks.applyMetadataMocks(
      metadataMocks.esClient,
      metadataMocks.fleetServices
    );
    (soClient.getCurrentNamespace as jest.Mock).mockReturnValue('foo');
    (endpointAppContextServiceMock.getEndpointMetadataService as jest.Mock).mockReturnValue(
      metadataMocks.endpointMetadataService
    );
    constructorOptions = {
      endpointService: endpointAppContextServiceMock,
      esClient: metadataMocks.esClient,
      soClient,
    };
    statusClient = new EndpointAgentStatusClient(constructorOptions);

    // FIXME:PT need to remove the need for this mock. It appears in several test files on our side.
    //  Its currently needed due to the direct use of Fleet's `buildAgentStatusRuntimeField()` in
    //  `x-pack/plugins/security_solution/server/endpoint/routes/metadata/query_builders.ts:239`
    (soClient.find as jest.Mock).mockResolvedValue({ saved_objects: [] });
    fleetAppContextService.start(
      fleetCreateAppContextStartContractMock({}, false, {
        withoutSpaceExtensions: soClient,
      })
    );
  });

  it('should retrieve endpoint metadata service using space id', async () => {
    await statusClient.getAgentStatuses(['one', 'two']);

    expect(constructorOptions.endpointService.getEndpointMetadataService).toHaveBeenCalledWith(
      'foo'
    );
  });

  it('should retrieve metadata and pending actions for the agents passed on input', async () => {
    const metadataClient = constructorOptions.endpointService.getEndpointMetadataService();
    const agentIds = ['one', 'two'];
    jest.spyOn(metadataClient, 'getHostMetadataList');
    await statusClient.getAgentStatuses(agentIds);

    expect(metadataClient.getHostMetadataList).toHaveBeenCalledWith(
      expect.objectContaining({ kuery: 'agent.id: one or agent.id: two' })
    );
    expect(getPendingActionsSummaryMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.anything(),
      agentIds
    );
  });

  it('should return expected data structure', async () => {
    await expect(
      statusClient.getAgentStatuses([dataMocks.unitedMetadata.agent.id])
    ).resolves.toEqual({
      '0dc3661d-6e67-46b0-af39-6f12b025fcb0': {
        agentId: '0dc3661d-6e67-46b0-af39-6f12b025fcb0',
        agentType: 'endpoint',
        found: true,
        isolated: false,
        lastSeen: expect.any(String),
        pendingActions: {},
        status: 'unhealthy',
      },
    });
  });
});
