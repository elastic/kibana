/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { catchAndWrapError } from '../../../../utils';
import { type AgentStatusRecords, HostStatus } from '../../../../../../common/endpoint/types';
import type { ResponseActionAgentType } from '../../../../../../common/endpoint/service/response_actions/constants';
import { AgentStatusClient } from '../lib/base_agent_status_client';
import { getPendingActionsSummary } from '../../../actions';
import { AgentStatusClientError } from '../errors';

export class EndpointAgentStatusClient extends AgentStatusClient {
  protected readonly agentType: ResponseActionAgentType = 'endpoint';

  async getAgentStatuses(agentIds: string[]): Promise<AgentStatusRecords> {
    const metadataService = this.options.endpointService.getEndpointMetadataService();
    const esClient = this.options.esClient;
    const soClient = this.options.soClient;

    try {
      const agentIdsKql = agentIds.map((agentId) => `agent.id: ${agentId}`).join(' or ');
      const [{ data: hostInfoForAgents }, allPendingActions] = await Promise.all([
        metadataService.getHostMetadataList(
          esClient,
          soClient,
          this.options.endpointService.getInternalFleetServices(),
          {
            page: 0,
            pageSize: 1000,
            kuery: agentIdsKql,
          }
        ),
        getPendingActionsSummary(esClient, metadataService, this.log, agentIds),
      ]).catch(catchAndWrapError);

      return agentIds.reduce<AgentStatusRecords>((acc, agentId) => {
        const agentMetadata = hostInfoForAgents.find(
          (hostInfo) => hostInfo.metadata.agent.id === agentId
        );

        const pendingActions = allPendingActions.find(
          (agentPendingActions) => agentPendingActions.agent_id === agentId
        );

        acc[agentId] = {
          agentId,
          agentType: this.agentType,
          found: agentMetadata !== undefined,
          isolated: Boolean(agentMetadata?.metadata.Endpoint.state?.isolation),
          lastSeen: agentMetadata?.last_checkin || '',
          pendingActions: pendingActions?.pending_actions ?? {},
          status: agentMetadata?.host_status || HostStatus.OFFLINE,
        };

        return acc;
      }, {});
    } catch (err) {
      const error = new AgentStatusClientError(
        `Failed to fetch endpoint agent statuses for agentIds: [${agentIds}], failed with: ${err.message}`,
        500,
        err
      );
      this.log.error(error);
      throw error;
    }
  }
}
