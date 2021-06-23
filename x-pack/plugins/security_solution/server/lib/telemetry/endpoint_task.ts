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

export const TelemetryEndpointTaskConstants = {
  TIMEOUT: '1m',
  TYPE: 'security:endpoint-metrics-dev',
  INTERVAL: '3m', // TODO:@pjhampton set this to 24h
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
              const executeFrom = getLastTaskExecutionTimestamp(
                executeTo,
                taskInstance.state?.lastExecutionTimestamp
              );

              const hits = await this.runTask(taskInstance.id, executeFrom, executeTo);
              this.logger.debug(`hits: ${hits}`);

              return {
                state: {
                  lastExecutionTimestamp: executeTo,
                  runs: (state.runs || 0) + 1,
                  // TODO:@pjhampton - add debuging state for dev
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

  public runTask = async (taskId: string, searchFrom: string, searchTo: string) => {
    this.logger.debug(`Running task ${taskId}`);
    if (taskId !== this.getTaskId()) {
      this.logger.debug(`Outdated task running: ${taskId}`);
      return 0;
    }

    const isOptedIn = await this.sender.isTelemetryOptedIn();
    if (!isOptedIn) {
      this.logger.debug(`Telemetry is not opted-in.`);
      return 0;
    }

    const failedPolicyResponses = await this.sender.fetchFailedEndpointPolicyResponses();
    this.logger.debug(`ep policy responses: ${failedPolicyResponses}`);

    if (failedPolicyResponses.hits.hits.length === 0) {
      this.logger.debug('No failed policy responses');
      return 0;
    }

    const agents = await this.sender.fetchFleetAgents();
    const agentCache = new Map(
      agents?.agents.map((agent) => [
        agent.id,
        { policy_id: agent.policy_id, policy_version: agent.policy_revision },
      ])
    );

    const endpointPolicyCache = new Map<string, FullAgentPolicyInput>();
    for (const policyInfo of agentCache.values()) {
      if (policyInfo.policy_id !== null && policyInfo.policy_id !== undefined) {
        if (!endpointPolicyCache.has(policyInfo.policy_id)) {
          const packagePolicies = await this.sender.fetchEndpointPolicyConfigs(
            policyInfo.policy_id
          );
          packagePolicies?.inputs.forEach((input) => {
            if (input.type === 'endpoint' && policyInfo.policy_id !== undefined) {
              endpointPolicyCache.set(policyInfo.policy_id, input);
            }
          });
        }
      }
    }

    const failedPolicyResponseTelemetry = failedPolicyResponses.hits.hits.map((hit) => {
      const agentId = hit._source?.elastic.agent.id;
      if (agentId === undefined) {
        // agent no longer available
        return null;
      }
      const policyInformation = agentCache.get(agentId);
      const policyConfig = endpointPolicyCache.get(policyInformation?.policy_id!);

      return {
        endpoint_id: hit._source?.agent.id,
        fleet_agent_id: hit._source?.elastic.agent.id,
        policy_response_failure: hit._source?.Endpoint.policy.applied,
        policy_config: policyConfig,
      };
    });

    this.logger.debug(`${failedPolicyResponseTelemetry}`);
    this.sender.sendOnDemand('endpoint-metadata', failedPolicyResponseTelemetry, true);

    return failedPolicyResponseTelemetry.length; // hits
  };
}
