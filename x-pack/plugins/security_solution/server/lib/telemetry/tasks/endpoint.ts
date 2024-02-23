/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { AgentPolicy } from '@kbn/fleet-plugin/common';
import { FLEET_ENDPOINT_PACKAGE } from '@kbn/fleet-plugin/common';
import type { ITelemetryEventsSender } from '../sender';
import {
  type EndpointMetadataAggregation,
  type EndpointMetadataDocument,
  type Nullable,
  type FleetAgentResponse,
  TelemetryCounter,
  TelemetryChannel,
  type EndpointPolicyResponseDocument,
} from '../types';
import type { ITelemetryReceiver } from '../receiver';
import type { TaskExecutionPeriod } from '../task';
import type { ITaskMetricsService } from '../task_metrics.types';
import {
  addDefaultAdvancedPolicyConfigSettings,
  batchTelemetryRecords,
  createUsageCounterLabel,
  extractEndpointPolicyConfig,
  getPreviousDailyTaskTimestamp,
  isPackagePolicyList,
  newTelemetryLogger,
  safeValue,
} from '../helpers';
import type { PolicyData } from '../../../../common/endpoint/types';
import { TELEMETRY_CHANNEL_ENDPOINT_META } from '../constants';

// Endpoint agent uses this Policy ID while it's installing.
const DefaultEndpointPolicyIdToIgnore = '00000000-0000-0000-0000-000000000000';

const EmptyFleetAgentResponse: FleetAgentResponse = {
  agents: [],
  total: 0,
  page: 0,
  perPage: 0,
};

const usageLabelPrefix: string[] = ['security_telemetry', 'endpoint_task'];

export function createTelemetryEndpointTaskConfig(maxTelemetryBatch: number) {
  const taskType = 'security:endpoint-meta-telemetry';
  return {
    type: taskType,
    title: 'Security Solution Telemetry Endpoint Metrics and Info task',
    interval: '24h',
    timeout: '5m',
    version: '1.0.0',
    getLastExecutionTime: getPreviousDailyTaskTimestamp,
    runTask: async (
      taskId: string,
      logger: Logger,
      receiver: ITelemetryReceiver,
      sender: ITelemetryEventsSender,
      taskMetricsService: ITaskMetricsService,
      taskExecutionPeriod: TaskExecutionPeriod
    ) => {
      const log = newTelemetryLogger(logger.get('endpoint'));
      const trace = taskMetricsService.start(taskType);

      log.l(
        `Running task: ${taskId} [last: ${taskExecutionPeriod.last} - current: ${taskExecutionPeriod.current}]`
      );

      try {
        if (!taskExecutionPeriod.last) {
          throw new Error('last execution timestamp is required');
        }

        const clusterData = await fetchClusterData(receiver);

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
        if (endpointData.endpointMetrics.totalEndpoints === 0) {
          log.l('no endpoint metrics to report');
          taskMetricsService.end(trace);
          return 0;
        }

        const telemetryUsageCounter = sender.getTelemetryUsageCluster();
        telemetryUsageCounter?.incrementCounter({
          counterName: createUsageCounterLabel(
            usageLabelPrefix.concat(['payloads', TelemetryChannel.ENDPOINT_META])
          ),
          counterType: TelemetryCounter.NUM_ENDPOINT,
          incrementBy: endpointData.endpointMetrics.totalEndpoints,
        });

        /** STAGE 2 - Fetch Fleet Agent Config
         *
         * As the policy id + policy version does not exist on the Endpoint Metrics document
         * we need to fetch information about the Fleet Agent and sync the metrics document
         * with the Agent's policy data.
         *
         */
        const agentsResponse = endpointData.fleetAgentsResponse;

        if (agentsResponse === undefined || agentsResponse === null) {
          log.l('no fleet agent information available');
          taskMetricsService.end(trace);
          return 0;
        }

        const policyInfoByAgent = agentsResponse.agents.reduce((cache, agent) => {
          if (agent.id === DefaultEndpointPolicyIdToIgnore) {
            return cache;
          }

          if (agent.policy_id !== null && agent.policy_id !== undefined) {
            cache.set(agent.id, agent.policy_id);
          }

          return cache;
        }, new Map<string, string>());

        const endpointPolicyById = await endpointPolicies(policyInfoByAgent.values(), receiver);

        /**
         * STAGE 3 - Fetch Endpoint Policy Responses
         */
        const policyResponses = endpointData.epPolicyResponse;

        /** STAGE 4 - Fetch Endpoint Agent Metadata
         *
         * Reads Endpoint Agent metadata out of the `.ds-metrics-endpoint.metadata` data stream
         * and buckets them by Endpoint Agent id and sorts by the top hit. The EP agent will
         * report its metadata once per day OR every time a policy change has occured. If
         * a metadata document(s) exists for an EP agent we map to fleet agent and policy
         */
        if (endpointData.endpointMetadata === undefined) {
          log.l(`no endpoint metadata to report`);
        }

        const { body: endpointMetadataResponse } = endpointData.endpointMetadata as unknown as {
          body: EndpointMetadataAggregation;
        };

        if (endpointMetadataResponse.aggregations === undefined) {
          log.l(`no endpoint metadata to report`);
        }

        const endpointMetadata =
          endpointMetadataResponse.aggregations.endpoint_metadata.buckets.reduce(
            (cache, endpointAgentId) => {
              const doc = endpointAgentId.latest_metadata.hits.hits[0];
              cache.set(endpointAgentId.key, doc);
              return cache;
            },
            new Map<string, EndpointMetadataDocument>()
          );

        /** STAGE 5 - Create the telemetry log records
         *
         * Iterates through the endpoint metrics documents at STAGE 1 and joins them together
         * to form the telemetry log that is sent back to Elastic Security developers to
         * make improvements to the product.
         *
         */
        try {
          const endpointMetrics = [];
          for await (const metrics of receiver.fetchEndpointMetricsById(
            endpointData.endpointMetrics.endpointMetricIds
          )) {
            endpointMetrics.push(...metrics);
          }

          const telemetryPayloads = endpointMetrics.map((endpointMetric) => {
            let policyConfig = null;
            let failedPolicy: Nullable<EndpointPolicyResponseDocument> = null;
            let endpointMetadataById = null;

            const fleetAgentId = endpointMetric.elastic.agent.id;
            const endpointAgentId = endpointMetric.agent.id;

            const policyInformation = policyInfoByAgent.get(fleetAgentId);
            if (policyInformation) {
              policyConfig = endpointPolicyById.get(policyInformation) || null;

              if (policyConfig) {
                failedPolicy = policyResponses.get(endpointAgentId);
              }
            }

            if (endpointMetadata) {
              endpointMetadataById = endpointMetadata.get(endpointAgentId);
            }

            const {
              cpu,
              memory,
              uptime,
              documents_volume: documentsVolume,
              malicious_behavior_rules: maliciousBehaviorRules,
              system_impact: systemImpact,
              threads,
              event_filter: eventFilter,
            } = endpointMetric.Endpoint.metrics;
            const endpointPolicyDetail = extractEndpointPolicyConfig(policyConfig);
            if (endpointPolicyDetail) {
              endpointPolicyDetail.value = addDefaultAdvancedPolicyConfigSettings(
                endpointPolicyDetail.value
              );
            }
            return {
              '@timestamp': taskExecutionPeriod.current,
              cluster_uuid: clusterData.clusterInfo.cluster_uuid,
              cluster_name: clusterData.clusterInfo.cluster_name,
              license_id: clusterData.licenseInfo?.uid,
              endpoint_id: endpointAgentId,
              endpoint_version: endpointMetric.agent.version,
              endpoint_package_version: policyConfig?.package?.version || null,
              endpoint_metrics: {
                cpu: cpu.endpoint,
                memory: memory.endpoint.private,
                uptime,
                documentsVolume,
                maliciousBehaviorRules,
                systemImpact,
                threads,
                eventFilter,
              },
              endpoint_meta: {
                os: endpointMetric.host.os,
                capabilities:
                  endpointMetadataById !== null && endpointMetadataById !== undefined
                    ? endpointMetadataById._source.Endpoint.capabilities
                    : [],
              },
              policy_config: endpointPolicyDetail !== null ? endpointPolicyDetail : {},
              policy_response:
                failedPolicy !== null && failedPolicy !== undefined
                  ? {
                      agent_policy_status: failedPolicy.event.agent_id_status,
                      manifest_version:
                        failedPolicy.Endpoint.policy.applied.artifacts.global.version,
                      status: failedPolicy.Endpoint.policy.applied.status,
                      actions: failedPolicy.Endpoint.policy.applied.actions
                        .map((action) => (action.status !== 'success' ? action : null))
                        .filter((action) => action !== null),
                      configuration: failedPolicy.Endpoint.configuration,
                      state: failedPolicy.Endpoint.state,
                    }
                  : {},
              telemetry_meta: {
                metrics_timestamp: endpointMetric['@timestamp'],
              },
            };
          });

          log.l(`sending ${telemetryPayloads.length} endpoint telemetry records`);

          /**
           * STAGE 6 - Send the documents
           *
           * Send the documents in a batches of maxTelemetryBatch
           */
          const batches = batchTelemetryRecords(telemetryPayloads, maxTelemetryBatch);
          for (const batch of batches) {
            await sender.sendOnDemand(TELEMETRY_CHANNEL_ENDPOINT_META, batch);
          }
          taskMetricsService.end(trace);
          return telemetryPayloads.length;
        } catch (err) {
          log.warn(`could not complete endpoint alert telemetry task due to ${err?.message}`, err);
          taskMetricsService.end(trace, err);
          return 0;
        }
      } catch (err) {
        taskMetricsService.end(trace, err);
        return 0;
      }
    },
  };
}

async function fetchEndpointData(
  receiver: ITelemetryReceiver,
  executeFrom: string,
  executeTo: string
) {
  const [fleetAgentsResponse, epMetricsAbstractResponse, policyResponse, endpointMetadata] =
    await Promise.allSettled([
      receiver.fetchFleetAgents(),
      receiver.fetchEndpointMetricsAbstract(executeFrom, executeTo),
      receiver.fetchEndpointPolicyResponses(executeFrom, executeTo),
      receiver.fetchEndpointMetadata(executeFrom, executeTo),
    ]);

  return {
    fleetAgentsResponse: safeValue(fleetAgentsResponse, EmptyFleetAgentResponse),
    endpointMetrics: safeValue(epMetricsAbstractResponse),
    epPolicyResponse: safeValue(policyResponse),
    endpointMetadata: safeValue(endpointMetadata),
  };
}

async function fetchClusterData(receiver: ITelemetryReceiver) {
  const [clusterInfoPromise, licenseInfoPromise] = await Promise.allSettled([
    receiver.fetchClusterInfo(),
    receiver.fetchLicenseInfo(),
  ]);

  const clusterInfo = safeValue(clusterInfoPromise);
  const licenseInfo = safeValue(licenseInfoPromise);

  return { clusterInfo, licenseInfo };
}

async function endpointPolicies(policies: IterableIterator<string>, receiver: ITelemetryReceiver) {
  const endpointPolicyCache = new Map<string, PolicyData>();
  for (const policyInfo of policies) {
    if (policyInfo !== null && policyInfo !== undefined && !endpointPolicyCache.has(policyInfo)) {
      let agentPolicy: Nullable<AgentPolicy>;
      try {
        agentPolicy = await receiver.fetchPolicyConfigs(policyInfo);
      } catch (err) {
        // log.error(`error fetching policy config due to ${err?.message}`, err);
      }
      const packagePolicies = agentPolicy?.package_policies;

      if (packagePolicies !== undefined && isPackagePolicyList(packagePolicies)) {
        packagePolicies
          .map((pPolicy) => pPolicy as PolicyData)
          .forEach((pPolicy) => {
            if (pPolicy.inputs[0]?.config !== undefined && pPolicy.inputs[0]?.config !== null) {
              pPolicy.inputs.forEach((input) => {
                if (
                  input.type === FLEET_ENDPOINT_PACKAGE &&
                  input?.config !== undefined &&
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
  return endpointPolicyCache;
}
