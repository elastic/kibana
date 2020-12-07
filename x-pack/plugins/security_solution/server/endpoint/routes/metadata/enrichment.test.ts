/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { HostStatus, MetadataQueryStrategyVersions } from '../../../../common/endpoint/types';
import { createMockMetadataRequestContext } from '../../mocks';
import { EndpointDocGenerator } from '../../../../common/endpoint/generate_data';
import { enrichHostMetadata, MetadataRequestContext } from './handlers';

describe('test document enrichment', () => {
  let metaReqCtx: jest.Mocked<MetadataRequestContext>;
  const docGen = new EndpointDocGenerator();

  beforeEach(() => {
    metaReqCtx = createMockMetadataRequestContext();
  });

  // verify query version passed through
  describe('metadata query strategy enrichment', () => {
    it('should match v1 strategy when directed', async () => {
      const enrichedHostList = await enrichHostMetadata(
        docGen.generateHostMetadata(),
        metaReqCtx,
        MetadataQueryStrategyVersions.VERSION_1
      );
      expect(enrichedHostList.query_strategy_version).toEqual(
        MetadataQueryStrategyVersions.VERSION_1
      );
    });
    it('should match v2 strategy when directed', async () => {
      const enrichedHostList = await enrichHostMetadata(
        docGen.generateHostMetadata(),
        metaReqCtx,
        MetadataQueryStrategyVersions.VERSION_2
      );
      expect(enrichedHostList.query_strategy_version).toEqual(
        MetadataQueryStrategyVersions.VERSION_2
      );
    });
  });

  describe('host status enrichment', () => {
    let statusFn: jest.Mock;

    beforeEach(() => {
      statusFn = jest.fn();
      (metaReqCtx.endpointAppContextService.getAgentService as jest.Mock).mockImplementation(() => {
        return {
          getAgentStatusById: statusFn,
        };
      });
    });

    it('should return host online for online agent', async () => {
      statusFn.mockImplementation(() => 'online');

      const enrichedHostList = await enrichHostMetadata(
        docGen.generateHostMetadata(),
        metaReqCtx,
        MetadataQueryStrategyVersions.VERSION_2
      );
      expect(enrichedHostList.host_status).toEqual(HostStatus.ONLINE);
    });

    it('should return host offline for offline agent', async () => {
      statusFn.mockImplementation(() => 'offline');

      const enrichedHostList = await enrichHostMetadata(
        docGen.generateHostMetadata(),
        metaReqCtx,
        MetadataQueryStrategyVersions.VERSION_2
      );
      expect(enrichedHostList.host_status).toEqual(HostStatus.OFFLINE);
    });

    it('should return host unenrolling for unenrolling agent', async () => {
      statusFn.mockImplementation(() => 'unenrolling');

      const enrichedHostList = await enrichHostMetadata(
        docGen.generateHostMetadata(),
        metaReqCtx,
        MetadataQueryStrategyVersions.VERSION_2
      );
      expect(enrichedHostList.host_status).toEqual(HostStatus.UNENROLLING);
    });

    it('should return host error for degraded agent', async () => {
      statusFn.mockImplementation(() => 'degraded');

      const enrichedHostList = await enrichHostMetadata(
        docGen.generateHostMetadata(),
        metaReqCtx,
        MetadataQueryStrategyVersions.VERSION_2
      );
      expect(enrichedHostList.host_status).toEqual(HostStatus.ERROR);
    });

    it('should return host error for erroring agent', async () => {
      statusFn.mockImplementation(() => 'error');

      const enrichedHostList = await enrichHostMetadata(
        docGen.generateHostMetadata(),
        metaReqCtx,
        MetadataQueryStrategyVersions.VERSION_2
      );
      expect(enrichedHostList.host_status).toEqual(HostStatus.ERROR);
    });

    it('should return host error for warning agent', async () => {
      statusFn.mockImplementation(() => 'warning');

      const enrichedHostList = await enrichHostMetadata(
        docGen.generateHostMetadata(),
        metaReqCtx,
        MetadataQueryStrategyVersions.VERSION_2
      );
      expect(enrichedHostList.host_status).toEqual(HostStatus.ERROR);
    });

    it('should return host error for invalid agent', async () => {
      statusFn.mockImplementation(() => 'asliduasofb');

      const enrichedHostList = await enrichHostMetadata(
        docGen.generateHostMetadata(),
        metaReqCtx,
        MetadataQueryStrategyVersions.VERSION_2
      );
      expect(enrichedHostList.host_status).toEqual(HostStatus.ERROR);
    });
  });

  describe('policy info enrichment', () => {
    let agentMock: jest.Mock;
    let agentPolicyMock: jest.Mock;

    beforeEach(() => {
      agentMock = jest.fn();
      agentPolicyMock = jest.fn();
      (metaReqCtx.endpointAppContextService.getAgentService as jest.Mock).mockImplementation(() => {
        return {
          getAgent: agentMock,
          getAgentStatusById: jest.fn(),
        };
      });
      (metaReqCtx.endpointAppContextService.getAgentPolicyService as jest.Mock).mockImplementation(
        () => {
          return {
            get: agentPolicyMock,
          };
        }
      );
    });

    it('reflects current applied agent info', async () => {
      const policyID = 'abc123';
      const policyRev = 9;
      agentMock.mockImplementation(() => {
        return {
          policy_id: policyID,
          policy_revision: policyRev,
        };
      });

      const enrichedHostList = await enrichHostMetadata(
        docGen.generateHostMetadata(),
        metaReqCtx,
        MetadataQueryStrategyVersions.VERSION_2
      );
      expect(enrichedHostList.policy_info).toBeDefined();
      expect(enrichedHostList.policy_info!.agent.applied.id).toEqual(policyID);
      expect(enrichedHostList.policy_info!.agent.applied.revision).toEqual(policyRev);
    });

    it('reflects current fleet agent info', async () => {
      const policyID = 'xyz456';
      const policyRev = 15;
      agentPolicyMock.mockImplementation(() => {
        return {
          id: policyID,
          revision: policyRev,
        };
      });

      const enrichedHostList = await enrichHostMetadata(
        docGen.generateHostMetadata(),
        metaReqCtx,
        MetadataQueryStrategyVersions.VERSION_2
      );
      expect(enrichedHostList.policy_info).toBeDefined();
      expect(enrichedHostList.policy_info!.agent.configured.id).toEqual(policyID);
      expect(enrichedHostList.policy_info!.agent.configured.revision).toEqual(policyRev);
    });

    it('reflects current endpoint policy info', async () => {
      const policyID = 'endpoint-b33f';
      const policyRev = 2;
      agentPolicyMock.mockImplementation(() => {
        return {
          package_policies: [
            {
              package: { name: 'endpoint' },
              id: policyID,
              revision: policyRev,
            },
          ],
        };
      });

      const enrichedHostList = await enrichHostMetadata(
        docGen.generateHostMetadata(),
        metaReqCtx,
        MetadataQueryStrategyVersions.VERSION_2
      );
      expect(enrichedHostList.policy_info).toBeDefined();
      expect(enrichedHostList.policy_info!.endpoint.id).toEqual(policyID);
      expect(enrichedHostList.policy_info!.endpoint.revision).toEqual(policyRev);
    });
  });
});
