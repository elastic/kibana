/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { FLEET_ENDPOINT_PACKAGE } from '@kbn/fleet-plugin/common';
import type { ITelemetryEventsSender } from '../sender';
import {
  TelemetryChannel,
  TelemetryCounter,
  type EndpointMetadataDocument,
  type EndpointMetricDocument,
  type EndpointMetricsAbstract,
  type EndpointPolicyResponseDocument,
  type ESClusterInfo,
  type ESLicense,
  type FleetAgentResponse,
  type Nullable,
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
import type { TelemetryLogger } from '../telemetry_logger';
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

        /**
         * STAGE 1 - Fetch Endpoint Agent Metrics
         * If no metrics exist, then abort execution, otherwise increment
         * the usage counter and continue.
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

        /**
         * STAGE 2
         *  - Fetch Fleet Agent Config
         *  - Ignore policy used while installing the endpoint agent.
         *  - Fetch Endpoint Policy Configs
         */
        const policyIdByAgent = endpointData.policyIdByAgent;
        endpointData.policyIdByAgent.delete(DefaultEndpointPolicyIdToIgnore);
        const endpointPolicyById = await endpointPolicies(policyIdByAgent.values(), receiver, log);

        /**
         * STAGE 3 - Fetch Endpoint Policy Responses
         */
        const policyResponses = endpointData.epPolicyResponse;
        if (policyResponses.size === 0) {
          log.l('no endpoint policy responses to report');
        }

        /**
         * STAGE 4 - Fetch Endpoint Agent Metadata
         */
        const endpointMetadata = endpointData.endpointMetadata;
        if (endpointMetadata.size === 0) {
          log.l(`no endpoint metadata to report`);
        }

        /** STAGE 5 - Create the telemetry log records
         *
         * Iterates through the endpoint metrics documents at STAGE 1 and joins them together
         * to form the telemetry log that is sent back to Elastic Security developers to
         * make improvements to the product.
         */
        const mappingContext = {
          policyIdByAgent,
          endpointPolicyById,
          policyResponses,
          endpointMetadata,
          taskExecutionPeriod,
          clusterData,
        };
        const telemetryPayloads = [];
        for await (const metrics of receiver.fetchEndpointMetricsById(
          endpointData.endpointMetrics.endpointMetricIds
        )) {
          const payloads = metrics.map((endpointMetric) =>
            mapEndpointMetric(endpointMetric, mappingContext)
          );
          telemetryPayloads.push(...payloads);
        }

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
    },
  };
}

async function fetchEndpointData(
  receiver: ITelemetryReceiver,
  executeFrom: string,
  executeTo: string
): Promise<{
  policyIdByAgent: Map<string, string>;
  endpointMetrics: EndpointMetricsAbstract;
  epPolicyResponse: Map<string, EndpointPolicyResponseDocument>;
  endpointMetadata: Map<string, EndpointMetadataDocument>;
}> {
  const [policyIdByAgent, epMetricsAbstractResponse, policyResponse, endpointMetadata] =
    await Promise.allSettled([
      receiver.fetchFleetAgents(),
      receiver.fetchEndpointMetricsAbstract(executeFrom, executeTo),
      receiver.fetchEndpointPolicyResponses(executeFrom, executeTo),
      receiver.fetchEndpointMetadata(executeFrom, executeTo),
    ]);

  return {
    policyIdByAgent: safeValue(policyIdByAgent, EmptyFleetAgentResponse),
    endpointMetrics: safeValue(epMetricsAbstractResponse),
    epPolicyResponse: safeValue(policyResponse),
    endpointMetadata: safeValue(endpointMetadata),
  };
}

async function fetchClusterData(
  receiver: ITelemetryReceiver
): Promise<{ clusterInfo: ESClusterInfo; licenseInfo: Nullable<ESLicense> }> {
  const [clusterInfoPromise, licenseInfoPromise] = await Promise.allSettled([
    receiver.fetchClusterInfo(),
    receiver.fetchLicenseInfo(),
  ]);

  const clusterInfo = safeValue(clusterInfoPromise);
  const licenseInfo = safeValue(licenseInfoPromise);

  return { clusterInfo, licenseInfo };
}

async function endpointPolicies(
  policyIds: IterableIterator<string>,
  receiver: ITelemetryReceiver,
  log: TelemetryLogger
) {
  const endpointPolicyCache = new Map<string, PolicyData>();
  for (const policyId of policyIds) {
    if (policyId !== null && policyId !== undefined && !endpointPolicyCache.has(policyId)) {
      const agentPolicy = await receiver.fetchPolicyConfigs(policyId).catch((e) => {
        log.l(`error fetching policy config due to ${e?.message}`);
        return null;
      });

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
                  policyId !== undefined
                ) {
                  endpointPolicyCache.set(policyId, pPolicy);
                }
              });
            }
          });
      }
    }
  }
  return endpointPolicyCache;
}

function mapEndpointMetric(
  endpointMetric: EndpointMetricDocument,
  ctx: {
    policyIdByAgent: Map<string, string>;
    endpointPolicyById: Map<string, PolicyData>;
    policyResponses: Map<string, EndpointPolicyResponseDocument>;
    endpointMetadata: Map<string, EndpointMetadataDocument>;
    taskExecutionPeriod: TaskExecutionPeriod;
    clusterData: { clusterInfo: ESClusterInfo; licenseInfo: Nullable<ESLicense> };
  }
) {
  let policyConfig = null;
  let failedPolicy: Nullable<EndpointPolicyResponseDocument> = null;
  let endpointMetadataById = null;

  const fleetAgentId = endpointMetric.elastic.agent.id;
  const endpointAgentId = endpointMetric.agent.id;

  const policyId = ctx.policyIdByAgent.get(fleetAgentId);
  if (policyId) {
    policyConfig = ctx.endpointPolicyById.get(policyId) || null;

    if (policyConfig) {
      failedPolicy = ctx.policyResponses.get(endpointAgentId);
    }
  }

  if (ctx.endpointMetadata) {
    endpointMetadataById = ctx.endpointMetadata.get(endpointAgentId);
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
    endpointPolicyDetail.value = addDefaultAdvancedPolicyConfigSettings(endpointPolicyDetail.value);
  }
  return {
    '@timestamp': ctx.taskExecutionPeriod.current,
    cluster_uuid: ctx.clusterData.clusterInfo.cluster_uuid,
    cluster_name: ctx.clusterData.clusterInfo.cluster_name,
    license_id: ctx.clusterData.licenseInfo?.uid,
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
          ? endpointMetadataById.Endpoint.capabilities
          : [],
    },
    policy_config: endpointPolicyDetail !== null ? endpointPolicyDetail : {},
    policy_response:
      failedPolicy !== null && failedPolicy !== undefined
        ? {
            agent_policy_status: failedPolicy.event.agent_id_status,
            manifest_version: failedPolicy.Endpoint.policy.applied.artifacts.global.version,
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
}
