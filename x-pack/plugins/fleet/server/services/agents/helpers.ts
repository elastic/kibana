/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { SortResults } from '@elastic/elasticsearch/lib/api/types';
import type { SearchHit } from '@kbn/es-types';

import type { FleetServerAgentComponent, OutputMap } from '../../../common/types';

import { appContextService } from '..';

import type { Agent, AgentSOAttributes, AgentStatus, FleetServerAgent } from '../../types';

type FleetServerAgentESResponse =
  | estypes.GetGetResult<FleetServerAgent>
  | estypes.SearchResponse<FleetServerAgent>['hits']['hits'][0]
  | SearchHit<FleetServerAgent>;

export function searchHitToAgent(
  hit: FleetServerAgentESResponse & {
    sort?: SortResults;
    fields?: { status?: AgentStatus[] };
  }
): Agent {
  const outputs: OutputMap | undefined = hit._source?.outputs
    ? Object.entries(hit._source?.outputs).reduce((acc, [key, val]) => {
        acc[key] = {
          api_key_id: val.api_key_id,
          type: val.type,
          to_retire_api_key_ids: val.to_retire_api_key_ids
            ? val.to_retire_api_key_ids.map((item) => ({
                id: item.id,
                retired_at: item.retired_at,
              }))
            : undefined,
        };
        return acc;
      }, {} as OutputMap)
    : undefined;
  const components: FleetServerAgentComponent[] | undefined = hit._source?.components
    ? hit._source?.components.map((component) => ({
        id: component.id,
        type: component.type,
        status: component.status,
        message: component.message,
        units: component.units?.map((unit) => ({
          id: unit.id,
          type: unit.type,
          status: unit.status,
          message: unit.message,
          // key-value pairs
          payload: unit.payload,
        })),
      }))
    : undefined;
  const agent: Agent = {
    id: hit._id!,
    type: hit._source?.type!,
    namespaces: hit._source?.namespaces,
    active: hit._source?.active!,
    enrolled_at: hit._source?.enrolled_at!,
    unenrolled_at: hit._source?.unenrolled_at!,
    unenrollment_started_at: hit._source?.unenrollment_started_at,
    upgraded_at: hit._source?.upgraded_at,
    upgrade_started_at: hit._source?.upgrade_started_at,
    upgrade_details: hit._source?.upgrade_details,
    access_api_key_id: hit._source?.access_api_key_id,
    default_api_key_id: hit._source?.default_api_key_id,
    policy_id: hit._source?.policy_id,
    last_checkin: hit._source?.last_checkin,
    last_checkin_status: hit._source?.last_checkin_status,
    last_checkin_message: hit._source?.last_checkin_message,
    policy_revision: hit._source?.policy_revision_idx,
    packages: hit._source?.packages ?? [],
    sort: hit.sort,
    tags: hit._source?.tags,
    outputs,
    components,
    default_api_key_history: hit._source?.default_api_key_history
      ? hit._source?.default_api_key_history.map((item) => ({
          id: item.id,
          retired_at: item.retired_at,
        }))
      : undefined,
    agent: hit._source?.agent
      ? { id: hit._source?.agent.id, version: hit._source?.agent.version }
      : undefined,

    // key-value pairs
    user_provided_metadata: hit._source?.user_provided_metadata!,
    local_metadata: hit._source?.local_metadata!,
    unhealthy_reason: hit._source?.unhealthy_reason,
  };

  if (!hit.fields?.status?.length) {
    appContextService
      .getLogger()
      .error(
        'Agent status runtime field is missing, unable to get agent status for agent ' + agent.id
      );
  } else {
    agent.status = hit.fields.status[0];
  }

  return agent;
}

export function agentSOAttributesToFleetServerAgentDoc(
  data: Partial<AgentSOAttributes>
): Partial<Omit<FleetServerAgent, 'id'>> {
  const { policy_revision: policyRevison, ...rest } = data;

  const doc: Partial<Omit<FleetServerAgent, 'id'>> = { ...rest };

  if (policyRevison !== undefined) {
    doc.policy_revision_idx = policyRevison;
  }

  if (!doc.updated_at) {
    doc.updated_at = new Date().toISOString();
  }

  return doc;
}
