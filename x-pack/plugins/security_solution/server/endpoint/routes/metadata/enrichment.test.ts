/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HostStatus } from '../../../../common/endpoint/types';
import { createMockMetadataRequestContext } from '../../mocks';
import { EndpointDocGenerator } from '../../../../common/endpoint/generate_data';
import { enrichHostMetadata, MetadataRequestContext } from './handlers';
import { AgentClient } from '../../../../../fleet/server';

describe('test document enrichment', () => {
  let metaReqCtx: jest.Mocked<MetadataRequestContext>;
  const docGen = new EndpointDocGenerator();

  beforeEach(() => {
    metaReqCtx = createMockMetadataRequestContext();
  });

  describe('host status enrichment', () => {
    let statusFn: jest.Mock;

    beforeEach(() => {
      statusFn = jest.fn();
      metaReqCtx.requestHandlerContext!.fleet!.agentClient.asCurrentUser = {
        getAgentStatusById: statusFn,
      } as unknown as AgentClient;
    });

    it('should return host healthy for online agent', async () => {
      statusFn.mockImplementation(() => 'online');

      const enrichedHostList = await enrichHostMetadata(docGen.generateHostMetadata(), metaReqCtx);
      expect(enrichedHostList.host_status).toEqual(HostStatus.HEALTHY);
    });

    it('should return host offline for offline agent', async () => {
      statusFn.mockImplementation(() => 'offline');

      const enrichedHostList = await enrichHostMetadata(docGen.generateHostMetadata(), metaReqCtx);
      expect(enrichedHostList.host_status).toEqual(HostStatus.OFFLINE);
    });

    it('should return host updating for unenrolling agent', async () => {
      statusFn.mockImplementation(() => 'unenrolling');

      const enrichedHostList = await enrichHostMetadata(docGen.generateHostMetadata(), metaReqCtx);
      expect(enrichedHostList.host_status).toEqual(HostStatus.UPDATING);
    });

    it('should return host unhealthy for degraded agent', async () => {
      statusFn.mockImplementation(() => 'degraded');

      const enrichedHostList = await enrichHostMetadata(docGen.generateHostMetadata(), metaReqCtx);
      expect(enrichedHostList.host_status).toEqual(HostStatus.UNHEALTHY);
    });

    it('should return host unhealthy for erroring agent', async () => {
      statusFn.mockImplementation(() => 'error');

      const enrichedHostList = await enrichHostMetadata(docGen.generateHostMetadata(), metaReqCtx);
      expect(enrichedHostList.host_status).toEqual(HostStatus.UNHEALTHY);
    });

    it('should return host unhealthy for warning agent', async () => {
      statusFn.mockImplementation(() => 'warning');

      const enrichedHostList = await enrichHostMetadata(docGen.generateHostMetadata(), metaReqCtx);
      expect(enrichedHostList.host_status).toEqual(HostStatus.UNHEALTHY);
    });

    it('should return host unhealthy for invalid agent', async () => {
      statusFn.mockImplementation(() => 'asliduasofb');

      const enrichedHostList = await enrichHostMetadata(docGen.generateHostMetadata(), metaReqCtx);
      expect(enrichedHostList.host_status).toEqual(HostStatus.UNHEALTHY);
    });
  });

  describe('policy info enrichment', () => {
    let agentMock: jest.Mock;
    let agentPolicyMock: jest.Mock;

    beforeEach(() => {
      agentMock = jest.fn();
      agentPolicyMock = jest.fn();
      metaReqCtx.requestHandlerContext!.fleet!.agentClient.asCurrentUser = {
        getAgent: agentMock,
        getAgentStatusById: jest.fn(),
      } as unknown as AgentClient;
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

      const enrichedHostList = await enrichHostMetadata(docGen.generateHostMetadata(), metaReqCtx);
      expect(enrichedHostList.policy_info).toBeDefined();
      expect(enrichedHostList.policy_info?.agent.applied.id).toEqual(policyID);
      expect(enrichedHostList.policy_info?.agent.applied.revision).toEqual(policyRev);
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

      const enrichedHostList = await enrichHostMetadata(docGen.generateHostMetadata(), metaReqCtx);
      expect(enrichedHostList.policy_info).toBeDefined();
      expect(enrichedHostList.policy_info?.agent.configured.id).toEqual(policyID);
      expect(enrichedHostList.policy_info?.agent.configured.revision).toEqual(policyRev);
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

      const enrichedHostList = await enrichHostMetadata(docGen.generateHostMetadata(), metaReqCtx);
      expect(enrichedHostList.policy_info).toBeDefined();
      expect(enrichedHostList.policy_info?.endpoint.id).toEqual(policyID);
      expect(enrichedHostList.policy_info?.endpoint.revision).toEqual(policyRev);
    });
  });
});
