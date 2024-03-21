/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import moment from 'moment';
import type { ElasticsearchClient } from '@kbn/core/server';

import { SO_SEARCH_LIMIT } from '../../constants';

import type {
  FleetServerAgentAction,
  ActionStatus,
  ActionErrorResult,
  AgentActionType,
  ActionStatusOptions,
} from '../../types';
import {
  AGENT_ACTIONS_INDEX,
  AGENT_ACTIONS_RESULTS_INDEX,
  AGENTS_INDEX,
  AGENT_POLICY_INDEX,
} from '../../../common';
import { appContextService } from '..';

/**
 * Return current bulk actions
 */
export async function getActionStatuses(
  esClient: ElasticsearchClient,
  options: ActionStatusOptions
): Promise<ActionStatus[]> {
  const actionResults = await getActionResults(esClient, options);

  const policyChangeActions = await getPolicyChangeActions(esClient, options);
  const actionStatuses = [...actionResults, ...policyChangeActions].sort(
    (a: ActionStatus, b: ActionStatus) => (b.creationTime > a.creationTime ? 1 : -1)
  );
  return actionStatuses;
}

async function getActionResults(
  esClient: ElasticsearchClient,
  options: ActionStatusOptions
): Promise<ActionStatus[]> {
  const actions = await getActions(esClient, options);
  const cancelledActions = await getCancelledActions(esClient);
  let acks: any;

  try {
    acks = await esClient.search({
      index: AGENT_ACTIONS_RESULTS_INDEX,
      query: {
        bool: {
          // There's some perf/caching advantages to using filter over must
          // See https://www.elastic.co/guide/en/elasticsearch/reference/current/query-filter-context.html#filter-context
          filter: [{ terms: { action_id: actions.map((a) => a.actionId) } }],
        },
      },
      size: 0,
      aggs: {
        ack_counts: {
          terms: { field: 'action_id', size: actions.length || 10 },
          aggs: {
            max_timestamp: { max: { field: '@timestamp' } },
          },
        },
      },
    });
  } catch (err) {
    if (err.statusCode === 404) {
      // .fleet-actions-results does not yet exist
      appContextService.getLogger().debug(err);
    } else {
      throw err;
    }
  }

  const results = [];

  for (const action of actions) {
    const matchingBucket = (acks?.aggregations?.ack_counts as any)?.buckets?.find(
      (bucket: any) => bucket.key === action.actionId
    );
    const nbAgentsActioned = action.nbAgentsActioned || action.nbAgentsActionCreated;
    const docCount = matchingBucket?.doc_count ?? 0;
    const nbAgentsAck = Math.min(docCount, nbAgentsActioned);
    const completionTime = (matchingBucket?.max_timestamp as any)?.value_as_string;
    const complete = nbAgentsAck >= nbAgentsActioned;
    const cancelledAction = cancelledActions.find((a) => a.actionId === action.actionId);

    let errorCount = 0;
    let latestErrors: ActionErrorResult[] = [];
    try {
      // query to find errors in action results, cannot do aggregation on text type
      const errorResults = await esClient.search({
        index: AGENT_ACTIONS_RESULTS_INDEX,
        track_total_hits: true,
        rest_total_hits_as_int: true,
        query: {
          bool: {
            must: [{ term: { action_id: action.actionId } }],
            should: [
              {
                exists: {
                  field: 'error',
                },
              },
            ],
            minimum_should_match: 1,
          },
        },
        size: 0,
        aggs: {
          top_error_hits: {
            top_hits: {
              sort: [
                {
                  '@timestamp': {
                    order: 'desc',
                  },
                },
              ],
              _source: {
                includes: ['@timestamp', 'agent_id', 'error'],
              },
              size: options.errorSize,
            },
          },
        },
      });
      errorCount = (errorResults.hits.total as number) ?? 0;
      latestErrors = ((errorResults.aggregations?.top_error_hits as any)?.hits.hits ?? []).map(
        (hit: any) => ({
          agentId: hit._source.agent_id,
          error: hit._source.error,
          timestamp: hit._source['@timestamp'],
        })
      );
      if (latestErrors.length > 0) {
        const hostNames = await getHostNames(
          esClient,
          latestErrors.map((errorItem: ActionErrorResult) => errorItem.agentId)
        );
        latestErrors.forEach((errorItem: ActionErrorResult) => {
          errorItem.hostname = hostNames[errorItem.agentId] ?? errorItem.agentId;
        });
      }
    } catch (err) {
      if (err.statusCode === 404) {
        // .fleet-actions-results does not yet exist
        appContextService.getLogger().debug(err);
      } else {
        throw err;
      }
    }

    results.push({
      ...action,
      nbAgentsAck: nbAgentsAck - errorCount,
      nbAgentsFailed: errorCount,
      status: cancelledAction
        ? 'CANCELLED'
        : errorCount > 0 && complete
        ? 'FAILED'
        : complete
        ? 'COMPLETE'
        : action.status,
      nbAgentsActioned,
      cancellationTime: cancelledAction?.timestamp,
      completionTime,
      latestErrors,
    });
  }

  return results;
}

async function getActions(
  esClient: ElasticsearchClient,
  options: ActionStatusOptions
): Promise<ActionStatus[]> {
  const res = await esClient.search<FleetServerAgentAction>({
    index: AGENT_ACTIONS_INDEX,
    ignore_unavailable: true,
    from: options.page ?? 0,
    size: options.perPage ?? 20,
    query: {
      bool: {
        must_not: [
          {
            term: {
              type: 'CANCEL',
            },
          },
        ],
      },
    },
    body: {
      sort: [{ '@timestamp': 'desc' }],
    },
  });

  return Object.values(
    res.hits.hits.reduce((acc, hit) => {
      if (!hit._source || !hit._source.action_id) {
        return acc;
      }

      const source = hit._source!;

      if (!acc[source.action_id!]) {
        const isExpired =
          source.expiration && source.type !== 'UPGRADE'
            ? Date.parse(source.expiration) < Date.now()
            : false;
        acc[hit._source.action_id] = {
          actionId: hit._source.action_id,
          nbAgentsActionCreated: 0,
          nbAgentsAck: 0,
          version: hit._source.data?.version as string,
          startTime: source.start_time,
          type: source.type as AgentActionType,
          nbAgentsActioned: source.total ?? 0,
          status: isExpired
            ? 'EXPIRED'
            : hasRolloutPeriodPassed(source)
            ? 'ROLLOUT_PASSED'
            : 'IN_PROGRESS',
          expiration: source.expiration,
          newPolicyId: source.data?.policy_id as string,
          creationTime: source['@timestamp']!,
          nbAgentsFailed: 0,
          hasRolloutPeriod: !!source.rollout_duration_seconds,
        };
      }

      acc[hit._source.action_id].nbAgentsActionCreated += hit._source.agents?.length ?? 0;

      return acc;
    }, {} as { [k: string]: ActionStatus })
  );
}

export async function getCancelledActions(
  esClient: ElasticsearchClient
): Promise<Array<{ actionId: string; timestamp?: string }>> {
  const res = await esClient.search<FleetServerAgentAction>({
    index: AGENT_ACTIONS_INDEX,
    ignore_unavailable: true,
    size: SO_SEARCH_LIMIT,
    query: {
      bool: {
        filter: [
          {
            term: {
              type: 'CANCEL',
            },
          },
        ],
      },
    },
  });

  return res.hits.hits.map((hit) => ({
    actionId: hit._source?.data?.target_id as string,
    timestamp: hit._source?.['@timestamp'],
  }));
}

async function getHostNames(esClient: ElasticsearchClient, agentIds: string[]) {
  const agentsRes = await esClient.search({
    index: AGENTS_INDEX,
    query: {
      bool: {
        filter: {
          terms: {
            'agent.id': agentIds,
          },
        },
      },
    },
    size: agentIds.length,
    _source: ['local_metadata.host.name'],
  });
  const hostNames = agentsRes.hits.hits.reduce((acc: { [key: string]: string }, curr) => {
    acc[curr._id] = (curr._source as any).local_metadata.host.name;
    return acc;
  }, {});

  return hostNames;
}

export const hasRolloutPeriodPassed = (source: FleetServerAgentAction) =>
  source.type === 'UPGRADE' && source.rollout_duration_seconds
    ? Date.now() >
      moment(source.start_time ?? Date.now())
        .add(source.rollout_duration_seconds, 'seconds')
        .valueOf()
    : false;

async function getPolicyChangeActions(
  esClient: ElasticsearchClient,
  options: ActionStatusOptions
): Promise<ActionStatus[]> {
  const agentPoliciesRes = await esClient.search({
    index: AGENT_POLICY_INDEX,
    from: options.page ?? 0,
    size: options.perPage ?? 20,
    query: {
      bool: {
        filter: [
          {
            range: {
              revision_idx: {
                gt: 1,
              },
            },
          },
        ],
      },
    },
    sort: [
      {
        '@timestamp': {
          order: 'desc',
        },
      },
    ],
    _source: ['revision_idx', '@timestamp', 'policy_id'],
  });

  interface AgentPolicyRevision {
    policyId: string;
    revision: number;
    timestamp: string;
    agentsAssignedToPolicy: number;
    agentsOnAtLeastThisRevision: number;
  }

  const agentPolicies: { [key: string]: AgentPolicyRevision } = agentPoliciesRes.hits.hits.reduce(
    (acc, curr) => {
      const hit = curr._source! as any;
      acc[`${hit.policy_id}:${hit.revision_idx}`] = {
        policyId: hit.policy_id,
        revision: hit.revision_idx,
        timestamp: hit['@timestamp'],
        agentsAssignedToPolicy: 0,
        agentsOnAtLeastThisRevision: 0,
      };
      return acc;
    },
    {} as { [key: string]: AgentPolicyRevision }
  );

  const agentsPerPolicyRevisionRes = await esClient.search({
    index: AGENTS_INDEX,
    size: 0,
    // ignore unenrolled agents
    query: {
      bool: { must_not: [{ exists: { field: 'unenrolled_at' } }] },
    },
    aggs: {
      policies: {
        terms: {
          field: 'policy_id',
          size: 10,
        },
        aggs: {
          agents_per_rev: {
            terms: {
              field: 'policy_revision_idx',
              size: 10,
            },
          },
        },
      },
    },
  });

  interface AgentsPerPolicyRev {
    total: number;
    agentsPerRev: Array<{
      revision: number;
      agents: number;
    }>;
  }

  const agentsPerPolicyRevisionMap: { [key: string]: AgentsPerPolicyRev } = (
    agentsPerPolicyRevisionRes.aggregations!.policies as any
  ).buckets.reduce(
    (
      acc: { [key: string]: AgentsPerPolicyRev },
      policyBucket: { key: string; doc_count: number; agents_per_rev: any }
    ) => {
      const policyId = policyBucket.key;
      const policyAgentCount = policyBucket.doc_count;
      if (!acc[policyId])
        acc[policyId] = {
          total: 0,
          agentsPerRev: [],
        };
      acc[policyId].total = policyAgentCount;
      acc[policyId].agentsPerRev = policyBucket.agents_per_rev.buckets.map(
        (agentsPerRev: { key: string; doc_count: number }) => {
          return {
            revision: agentsPerRev.key,
            agents: agentsPerRev.doc_count,
          };
        }
      );
      return acc;
    },
    {}
  );

  Object.values(agentPolicies).forEach((agentPolicyRev) => {
    const agentsPerPolicyRev = agentsPerPolicyRevisionMap[agentPolicyRev.policyId];
    if (agentsPerPolicyRev) {
      agentPolicyRev.agentsAssignedToPolicy = agentsPerPolicyRev.total;
      agentsPerPolicyRev.agentsPerRev.forEach((item) => {
        if (agentPolicyRev.revision <= item.revision) {
          agentPolicyRev.agentsOnAtLeastThisRevision += item.agents;
        }
      });
    }
  });

  const agentPolicyUpdateActions: ActionStatus[] = Object.entries(agentPolicies).map(
    ([updateKey, updateObj]: [updateKey: string, updateObj: AgentPolicyRevision]) => {
      return {
        actionId: updateKey,
        creationTime: updateObj.timestamp,
        completionTime: updateObj.timestamp,
        type: 'POLICY_CHANGE',
        nbAgentsActioned: updateObj.agentsAssignedToPolicy,
        nbAgentsAck: updateObj.agentsOnAtLeastThisRevision,
        nbAgentsActionCreated: updateObj.agentsAssignedToPolicy,
        nbAgentsFailed: 0,
        status:
          updateObj.agentsAssignedToPolicy === updateObj.agentsOnAtLeastThisRevision
            ? 'COMPLETE'
            : 'IN_PROGRESS',
        policyId: updateObj.policyId,
        revision: updateObj.revision,
      };
    }
  );

  return agentPolicyUpdateActions;
}
