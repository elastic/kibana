/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { Logger } from 'src/core/server';
import {
  ConcreteTaskInstance,
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '../../../../task_manager/server';
import { getLastTaskExecutionTimestamp } from './helpers';
import { TelemetryEventsSender } from './sender';
import { FullAgentPolicyInput } from '../../../../fleet/common/types/models/agent_policy';
import {
  EndpointMetricsAggregation,
  EndpointPolicyResponseAggregation,
  EndpointPolicyResponseDocument,
  FleetAgentCacheItem,
} from './types';

export const TelemetryEndpointTaskConstants = {
  TIMEOUT: '5m',
  TYPE: 'security:endpoint-meta-telemetry',
  INTERVAL: '24m',
  VERSION: '1.0.0',
};

export class TelemetryEndpointTask {
  private readonly logger: Logger;
  private readonly sender: TelemetryEventsSender;

  constructor(
    logger: Logger,
    taskManager: TaskManagerSetupContract,
    sender: TelemetryEventsSender
  ) {
    this.logger = logger;
    this.sender = sender;

    taskManager.registerTaskDefinitions({
      [TelemetryEndpointTaskConstants.TYPE]: {
        title: 'Security Solution Telemetry Endpoint Metrics and Info task',
        timeout: TelemetryEndpointTaskConstants.TIMEOUT,
        createTaskRunner: ({ taskInstance }: { taskInstance: ConcreteTaskInstance }) => {
          const { state } = taskInstance;

          return {
            run: async () => {
              const executeTo = moment().utc().toISOString();
              const lastExecutionTimestamp = getLastTaskExecutionTimestamp(
                executeTo,
                taskInstance.state?.lastExecutionTimestamp
              );

              const hits = await this.runTask(taskInstance.id);

              return {
                state: {
                  lastExecutionTimestamp,
                  runs: (state.runs || 0) + 1,
                  hits,
                },
              };
            },
            cancel: async () => {},
          };
        },
      },
    });
  }

  public start = async (taskManager: TaskManagerStartContract) => {
    try {
      await taskManager.ensureScheduled({
        id: this.getTaskId(),
        taskType: TelemetryEndpointTaskConstants.TYPE,
        scope: ['securitySolution'],
        schedule: {
          interval: TelemetryEndpointTaskConstants.INTERVAL,
        },
        state: { runs: 0 },
        params: { version: TelemetryEndpointTaskConstants.VERSION },
      });
    } catch (e) {
      this.logger.error(`Error scheduling task, received ${e.message}`);
    }
  };

  private getTaskId = (): string => {
    return `${TelemetryEndpointTaskConstants.TYPE}:${TelemetryEndpointTaskConstants.VERSION}`;
  };

  private async fetchEndpointData() {
    const [epMetricsResponse, fleetAgentsResponse, policyResponse] = await Promise.allSettled([
      this.sender.fetchEndpointMetrics(),
      this.sender.fetchFleetAgents(),
      this.sender.fetchFailedEndpointPolicyResponses(),
    ]);

    return {
      endpointMetrics:
        epMetricsResponse.status === 'fulfilled' ? epMetricsResponse.value : undefined,
      fleetAgentsResponse:
        fleetAgentsResponse.status === 'fulfilled' ? fleetAgentsResponse.value : undefined,
      epPolicyResponse: policyResponse.status === 'fulfilled' ? policyResponse.value : undefined,
    };
  }

  public runTask = async (taskId: string) => {
    if (taskId !== this.getTaskId()) {
      this.logger.debug(`Outdated task running: ${taskId}`);
      return 0;
    }

    const isOptedIn = await this.sender.isTelemetryOptedIn();
    if (!isOptedIn) {
      this.logger.debug(`Telemetry is not opted-in.`);
      return 0;
    }

    const endpointData = await this.fetchEndpointData();

    const { body: endpointMetricsResponse } = (endpointData.endpointMetrics as unknown) as {
      body: EndpointMetricsAggregation;
    };
    if (endpointMetricsResponse.aggregations === undefined) {
      this.logger.debug(`No endpoint metrics`);
      return 0;
    }

    const endpointMetrics = endpointMetricsResponse.aggregations.endpoint_agents.buckets.map(
      (epMetrics) => {
        return {
          endpoint_agent: epMetrics.latest_metrics.hits.hits[0]._source.agent.id,
          endpoint_metrics: epMetrics.latest_metrics.hits.hits[0]._source,
        };
      }
    );

    if (endpointMetrics.length === 0) {
      this.logger.debug('no reported endpoint metrics');
      return 0;
    }

    const agentsResponse = endpointData.fleetAgentsResponse;
    if (agentsResponse === undefined) {
      this.logger.debug('no agents to report');
      return 0;
    }

    const fleetAgents = agentsResponse?.agents.reduce((cache, agent) => {
      cache.set(agent.id, { policy_id: agent.policy_id, policy_version: agent.policy_revision });
      return cache;
    }, new Map<string, FleetAgentCacheItem>());

    const endpointPolicyCache = new Map<string, FullAgentPolicyInput>();
    for (const policyInfo of fleetAgents.values()) {
      if (
        policyInfo.policy_id !== null &&
        policyInfo.policy_id !== undefined &&
        !endpointPolicyCache.has(policyInfo.policy_id)
      ) {
        const packagePolicies = await this.sender.fetchEndpointPolicyConfigs(policyInfo.policy_id);
        packagePolicies?.inputs.forEach((input) => {
          if (input.type === 'endpoint' && policyInfo.policy_id !== undefined) {
            endpointPolicyCache.set(policyInfo.policy_id, input);
          }
        });
      }
    }

    const { body: failedPolicyResponses } = (endpointData.epPolicyResponse as unknown) as {
      body: EndpointPolicyResponseAggregation;
    };
    const policyResponses = failedPolicyResponses.aggregations.policy_responses.buckets.reduce(
      (cache, bucket) => {
        const doc = bucket.latest_response.hits.hits[0];
        cache.set(bucket.key, doc);
        return cache;
      },
      new Map<string, EndpointPolicyResponseDocument>()
    );

    const telemetryPayloads = endpointMetrics.map((endpoint) => {
      let policyConfig = null;
      let failedPolicy = null;

      const fleetAgentId = endpoint.endpoint_metrics.elastic.agent.id;
      const endpointAgentId = endpoint.endpoint_agent;

      const policyInformation = fleetAgents.get(fleetAgentId);
      if (policyInformation?.policy_id) {
        policyConfig = endpointPolicyCache.get(policyInformation?.policy_id);
        if (policyConfig) {
          failedPolicy = policyResponses.get(policyConfig?.id);
        }
      }

      return {
        agent_id: fleetAgentId,
        endpoint_id: endpointAgentId,
        endpoint_metrics: {
          os: endpoint.endpoint_metrics.host.os,
          cpu: endpoint.endpoint_metrics.Endpoint.metrics.cpu,
          memory: endpoint.endpoint_metrics.Endpoint.metrics.memory,
          uptime: endpoint.endpoint_metrics.Endpoint.metrics.uptime,
        },
        policy_config: policyConfig,
        policy_failure: failedPolicy,
      };
    });

    this.sender.sendOnDemand('endpoint-metadata', telemetryPayloads);
    return telemetryPayloads.length;
  };
}
