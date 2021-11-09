/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from 'src/core/server';
import { TelemetryEventsSender } from '../sender';
import {
  EndpointMetricsAggregation,
  EndpointPolicyResponseAggregation,
  EndpointPolicyResponseDocument,
} from '../types';
import { TelemetryReceiver } from '../receiver';
import { TaskExecutionPeriod } from '../task';
import {
  batchTelemetryRecords,
  getPreviousDailyTaskTimestamp,
  isPackagePolicyList,
} from '../helpers';
import { PolicyData } from '../../../../common/endpoint/types';
import { FLEET_ENDPOINT_PACKAGE } from '../../../../../fleet/common';
import { TELEMETRY_CHANNEL_ENDPOINT_META } from '../constants';

// Endpoint agent uses this Policy ID while it's installing.
const DefaultEndpointPolicyIdToIgnore = '00000000-0000-0000-0000-000000000000';

const EmptyFleetAgentResponse = {
  agents: [],
  total: 0,
  page: 0,
  perPage: 0,
};

export function createTelemetryEndpointTaskConfig(maxTelemetryBatch: number) {
  return {
    type: 'security:endpoint-meta-telemetry',
    title: 'Security Solution Telemetry Endpoint Metrics and Info task',
    interval: '24h',
    timeout: '5m',
    version: '1.0.0',
    getLastExecutionTime: getPreviousDailyTaskTimestamp,
    runTask: async (
      taskId: string,
      logger: Logger,
      receiver: TelemetryReceiver,
      sender: TelemetryEventsSender,
      taskExecutionPeriod: TaskExecutionPeriod
    ) => {
      if (!taskExecutionPeriod.last) {
        throw new Error('last execution timestamp is required');
      }

      const endpointData = await fetchEndpointData(
        receiver,
        taskExecutionPeriod.last,
        taskExecutionPeriod.current
      );

      /** STAGE 1 - Fetch Endpoint Agent Metrics
       *
       * Reads Endpoint Agent metrics out of the `.ds-metrics-endpoint.metrics` data stream
       * and buckets them by Endpoint Agent id and sorts by the top hit. The EP agent will
       * report its metrics once per day OR every time a policy change has occured. If
       * a metric document(s) exists for an EP agent we map to fleet agent and policy
       */
      if (endpointData.endpointMetrics === undefined) {
        logger.debug(`no endpoint metrics to report`);
        return 0;
      }

      const { body: endpointMetricsResponse } = endpointData.endpointMetrics as unknown as {
        body: EndpointMetricsAggregation;
      };

      if (endpointMetricsResponse.aggregations === undefined) {
        logger.debug(`no endpoint metrics to report`);
        return 0;
      }

      const endpointMetrics = endpointMetricsResponse.aggregations.endpoint_agents.buckets.map(
        (epMetrics) => {
          return {
            endpoint_agent: epMetrics.latest_metrics.hits.hits[0]._source.agent.id,
            endpoint_version: epMetrics.latest_metrics.hits.hits[0]._source.agent.version,
            endpoint_metrics: epMetrics.latest_metrics.hits.hits[0]._source,
          };
        }
      );

      /** STAGE 2 - Fetch Fleet Agent Config
       *
       * As the policy id + policy version does not exist on the Endpoint Metrics document
       * we need to fetch information about the Fleet Agent and sync the metrics document
       * with the Agent's policy data.
       *
       */
      const agentsResponse = endpointData.fleetAgentsResponse;

      if (agentsResponse === undefined) {
        logger.debug('no fleet agent information available');
        return 0;
      }

      const fleetAgents = agentsResponse.agents.reduce((cache, agent) => {
        if (agent.id === DefaultEndpointPolicyIdToIgnore) {
          return cache;
        }

        if (agent.policy_id !== null && agent.policy_id !== undefined) {
          cache.set(agent.id, agent.policy_id);
        }

        return cache;
      }, new Map<string, string>());

      const endpointPolicyCache = new Map<string, PolicyData>();
      for (const policyInfo of fleetAgents.values()) {
        if (
          policyInfo !== null &&
          policyInfo !== undefined &&
          !endpointPolicyCache.has(policyInfo)
        ) {
          const agentPolicy = await receiver.fetchPolicyConfigs(policyInfo);
          const packagePolicies = agentPolicy?.package_policies;

          if (packagePolicies !== undefined && isPackagePolicyList(packagePolicies)) {
            packagePolicies
              .map((pPolicy) => pPolicy as PolicyData)
              .forEach((pPolicy) => {
                if (pPolicy.inputs[0].config !== undefined) {
                  pPolicy.inputs.forEach((input) => {
                    if (
                      input.type === FLEET_ENDPOINT_PACKAGE &&
                      input.config !== undefined &&
                      policyInfo !== undefined
                    ) {
                      endpointPolicyCache.set(policyInfo, pPolicy);
                    }
                  });
                }
              });
          }
        }
      }

      /** STAGE 3 - Fetch Endpoint Policy Responses
       *
       * Reads Endpoint Agent policy responses out of the `.ds-metrics-endpoint.policy*` data
       * stream and creates a local K/V structure that stores the policy response (V) with
       * the Endpoint Agent Id (K). A value will only exist if there has been a endpoint
       * enrolled in the last 24 hours OR a policy change has occurred. We only send
       * non-successful responses. If the field is null, we assume no responses in
       * the last 24h or no failures/warnings in the policy applied.
       *
       */
      const { body: failedPolicyResponses } = endpointData.epPolicyResponse as unknown as {
        body: EndpointPolicyResponseAggregation;
      };

      // If there is no policy responses in the 24h > now then we will continue
      const policyResponses = failedPolicyResponses.aggregations
        ? failedPolicyResponses.aggregations.policy_responses.buckets.reduce(
            (cache, endpointAgentId) => {
              const doc = endpointAgentId.latest_response.hits.hits[0];
              cache.set(endpointAgentId.key, doc);
              return cache;
            },
            new Map<string, EndpointPolicyResponseDocument>()
          )
        : new Map<string, EndpointPolicyResponseDocument>();

      /** STAGE 4 - Create the telemetry log records
       *
       * Iterates through the endpoint metrics documents at STAGE 1 and joins them together
       * to form the telemetry log that is sent back to Elastic Security developers to
       * make improvements to the product.
       *
       */
      try {
        const telemetryPayloads = endpointMetrics.map((endpoint) => {
          let policyConfig = null;
          let failedPolicy = null;

          const fleetAgentId = endpoint.endpoint_metrics.elastic.agent.id;
          const endpointAgentId = endpoint.endpoint_agent;

          const policyInformation = fleetAgents.get(fleetAgentId);
          if (policyInformation) {
            policyConfig = endpointPolicyCache.get(policyInformation) || null;

            if (policyConfig) {
              failedPolicy = policyResponses.get(endpointAgentId);
            }
          }

          const { cpu, memory, uptime } = endpoint.endpoint_metrics.Endpoint.metrics;

          return {
            '@timestamp': taskExecutionPeriod.current,
            endpoint_id: endpointAgentId,
            endpoint_version: endpoint.endpoint_version,
            endpoint_package_version: policyConfig?.package?.version || null,
            endpoint_metrics: {
              cpu: cpu.endpoint,
              memory: memory.endpoint.private,
              uptime,
            },
            endpoint_meta: {
              os: endpoint.endpoint_metrics.host.os,
            },
            policy_config: policyConfig !== null ? policyConfig?.inputs[0].config.policy : {},
            policy_response:
              failedPolicy !== null && failedPolicy !== undefined
                ? {
                    agent_policy_status: failedPolicy._source.event.agent_id_status,
                    manifest_version:
                      failedPolicy._source.Endpoint.policy.applied.artifacts.global.version,
                    status: failedPolicy._source.Endpoint.policy.applied.status,
                    actions: failedPolicy._source.Endpoint.policy.applied.actions
                      .map((action) => (action.status !== 'success' ? action : null))
                      .filter((action) => action !== null),
                  }
                : {},
            telemetry_meta: {
              metrics_timestamp: endpoint.endpoint_metrics['@timestamp'],
            },
          };
        });

        /**
         * STAGE 5 - Send the documents
         *
         * Send the documents in a batches of maxTelemetryBatch
         */
        batchTelemetryRecords(telemetryPayloads, maxTelemetryBatch).forEach((telemetryBatch) =>
          sender.sendOnDemand(TELEMETRY_CHANNEL_ENDPOINT_META, telemetryBatch)
        );
        return telemetryPayloads.length;
      } catch (err) {
        logger.warn('could not complete endpoint alert telemetry task');
        return 0;
      }
    },
  };
}

async function fetchEndpointData(
  receiver: TelemetryReceiver,
  executeFrom: string,
  executeTo: string
) {
  const [fleetAgentsResponse, epMetricsResponse, policyResponse] = await Promise.allSettled([
    receiver.fetchFleetAgents(),
    receiver.fetchEndpointMetrics(executeFrom, executeTo),
    receiver.fetchEndpointPolicyResponses(executeFrom, executeTo),
  ]);

  return {
    fleetAgentsResponse:
      fleetAgentsResponse.status === 'fulfilled'
        ? fleetAgentsResponse.value
        : EmptyFleetAgentResponse,
    endpointMetrics: epMetricsResponse.status === 'fulfilled' ? epMetricsResponse.value : undefined,
    epPolicyResponse: policyResponse.status === 'fulfilled' ? policyResponse.value : undefined,
  };
}
