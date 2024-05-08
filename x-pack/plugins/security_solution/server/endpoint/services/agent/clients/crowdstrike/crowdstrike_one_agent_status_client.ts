/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CROWDSTRIKE_CONNECTOR_ID,
  SUB_ACTION,
} from '@kbn/stack-connectors-plugin/common/crowdstrike/constants';
import type { ActionTypeExecutorResult } from '@kbn/actions-plugin/common';
import type { ConnectorWithExtraFindData } from '@kbn/actions-plugin/server/application/connector/types';
import type {
  CrowdstrikeGetAgentsResponse,
  CrowdstrikeGetAgentStatusResponse,
} from '@kbn/stack-connectors-plugin/common/crowdstrike/types';
import type { RawCrowdstrikeInfo } from './types';
import { catchAndWrapError } from '../../../../utils';
import { getPendingActionsSummary } from '../../..';
import { type AgentStatusRecords, HostStatus } from '../../../../../../common/endpoint/types';
import type { ResponseActionAgentType } from '../../../../../../common/endpoint/service/response_actions/constants';
import { AgentStatusClient } from '../lib/base_agent_status_client';
import { AgentStatusClientError } from '../errors';
import { CustomHttpRequestError } from '../../../../../utils/custom_http_request_error';

const CROWDSTRIKE_AGENT_INDEX_PATTERN = `logs-crowdstrike.host-*`;

enum CROWDSTRIKE_NETWORK_STATUS {
  NORMAL = 'normal',
  CONTAINED = 'contained',
  LIFT_CONTAINMENT_PENDING = 'lift_containment_pending',
  CONTAINMENT_PENDING = 'containment_pending',
}

enum CROWDSTRIKE_STATUS_RESPONSE {
  ONLINE = 'online',
  OFFLINE = 'offline',
  UNKNOWN = 'unknown',
}

export class CrowdstrikeAgentStatusClient extends AgentStatusClient {
  protected readonly agentType: ResponseActionAgentType = 'crowdstrike';
  async getAgentStatusFromConnectorAction(agentIds: string[]) {
    const connectorActionsClient = this.options.connectorActionsClient;

    let connectorList: ConnectorWithExtraFindData[] = [];

    try {
      connectorList = await connectorActionsClient.getAll();
    } catch (err) {
      throw new CustomHttpRequestError(
        `Unable to retrieve list of stack connectors: ${err.message}`,
        // failure here is likely due to Authz, but because we don't have a good way to determine that,
        // the `statusCode` below is set to `400` instead of `401`.
        400,
        err
      );
    }
    const connector = connectorList.find(({ actionTypeId, isDeprecated, isMissingSecrets }) => {
      return actionTypeId === CROWDSTRIKE_CONNECTOR_ID && !isDeprecated && !isMissingSecrets;
    });

    if (!connector) {
      throw new CustomHttpRequestError(`No Crowdstrike stack connector found`, 400, connectorList);
    }

    const agentStatusResponse = (await connectorActionsClient.execute({
      actionId: connector.id,
      params: {
        subAction: SUB_ACTION.GET_AGENT_STATUS,
        subActionParams: {
          ids: agentIds,
        },
      },
    })) as ActionTypeExecutorResult<CrowdstrikeGetAgentStatusResponse>;

    return (
      agentStatusResponse.data?.resources.reduce(
        (acc: Record<string, CrowdstrikeGetAgentStatusResponse['resources'][0]>, agent) => {
          return { ...acc, [String(agent.id)]: agent };
        },
        {}
      ) || {}
    );
  }
  async getAgentStatuses(agentIds: string[]): Promise<AgentStatusRecords> {
    const esClient = this.options.esClient;
    const metadataService = this.options.endpointService.getEndpointMetadataService();
    const sortField = 'crowdstrike.host.last_seen';

    const query = {
      bool: {
        must: [
          {
            bool: {
              filter: [
                {
                  terms: {
                    'crowdstrike.host.id': agentIds,
                  },
                },
              ],
            },
          },
        ],
      },
    };

    try {
      const [searchResponse, allPendingActions] = await Promise.all([
        esClient.search(
          {
            index: CROWDSTRIKE_AGENT_INDEX_PATTERN,
            from: 0,
            size: 10000,
            query,
            collapse: {
              // TODO: check if we should use crowdstrike.cid instead
              field: 'crowdstrike.host.id',
              inner_hits: {
                name: 'most_recent',
                size: 1,
                sort: [
                  {
                    [sortField]: {
                      order: 'desc',
                    },
                  },
                ],
              },
            },
            sort: [
              {
                [sortField]: {
                  order: 'desc',
                },
              },
            ],
            _source: false,
          },
          { ignore: [404] }
        ),

        getPendingActionsSummary(esClient, metadataService, this.log, agentIds),
      ]).catch(catchAndWrapError);

      const mostRecentAgentInfosByAgentId = searchResponse?.hits?.hits?.reduce<
        Record<string, RawCrowdstrikeInfo>
      >((acc, hit) => {
        // TODO TC: check if we should use crowdstrike.cid instead
        if (hit.fields?.['crowdstrike.host.id'][0]) {
          acc[hit.fields?.['crowdstrike.host.id'][0]] =
            hit.inner_hits?.most_recent.hits.hits[0]._source;
        }

        return acc;
      }, {});

      const agentStatuses = await this.getAgentStatusFromConnectorAction(agentIds);

      return agentIds.reduce<AgentStatusRecords>((acc, agentId) => {
        const agentInfo = mostRecentAgentInfosByAgentId[agentId].crowdstrike;

        const agentStatus = agentStatuses[agentId];
        const pendingActions = allPendingActions.find(
          (agentPendingActions) => agentPendingActions.agent_id === agentId
        );

        acc[agentId] = {
          agentId,
          agentType: this.agentType,
          // TODO: check if we should use crowdstrike.cid instead
          found: agentInfo?.host.id === agentId,
          isolated: agentInfo?.status === CROWDSTRIKE_NETWORK_STATUS.CONTAINED,
          lastSeen: agentInfo?.host.last_seen || '',
          status:
            agentStatus?.state === CROWDSTRIKE_STATUS_RESPONSE.ONLINE
              ? HostStatus.HEALTHY
              : // TODO TC: not sure what the UNKNOWN is - still to be figured
              agentStatus?.state === CROWDSTRIKE_STATUS_RESPONSE.UNKNOWN
              ? HostStatus.UNENROLLED
              : HostStatus.OFFLINE,

          pendingActions: pendingActions?.pending_actions ?? {},
        };

        return acc;
      }, {});
    } catch (err) {
      const error = new AgentStatusClientError(
        `Failed to fetch crowdstrike agent status for agentIds: [${agentIds}], failed with: ${err.message}`,
        500,
        err
      );
      this.log.error(error);
      throw error;
    }
  }
}
