/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreTasksSetup, PluginInitializerContext, TasksPlugin } from '@kbn/core/server';
import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import type { ApmDataAccessTasksSetup } from '@kbn/apm-data-access-plugin/server/tasks';
import type { ObservabilityAgentBuilderTasksSetup } from '@kbn/observability-agent-builder-plugin/server/tasks';
import { configSchema } from '../config_schema';
import type { APMConfig } from '..';
import { registerServiceMapAgentBuilder } from '../agent_builder/register_service_map';
import { registerDataProviders } from '../agent_builder/data_provider/register_data_providers';
import type { ApmToolCore } from '../agent_builder/utils/build_apm_tool_resources';

export const config = { schema: configSchema };

interface TasksSetupDeps {
  agentBuilder: AgentBuilderPluginSetup;
  observabilityAgentBuilder: ObservabilityAgentBuilderTasksSetup;
  apmDataAccess: ApmDataAccessTasksSetup;
  ruleRegistry: void;
}

/**
 * The agent builder side of APM for a task pod: the service map attachment types and skills, and the
 * data providers APM fills Observability Agent Builder's tools and attachments with, registered by
 * the same code as the plugin's `server` entry.
 *
 * What differs from Kibana, all because a pod has no such contract: alerts are not read (a provider
 * that needs them fails with the rule registry's message, the others do not), and Machine Learning
 * and SLO are absent, so service anomalies and SLO badges are left out of what the providers return,
 * as in Kibana without those plugins.
 *
 * In Kibana the plugin registered all of it and what this entry registers goes to no-op contracts.
 */
class ApmTasksPlugin implements TasksPlugin<void, void, TasksSetupDeps> {
  constructor(private readonly context: PluginInitializerContext<APMConfig>) {}

  setup(
    core: CoreTasksSetup,
    { agentBuilder, observabilityAgentBuilder, apmDataAccess, ruleRegistry }: TasksSetupDeps
  ) {
    registerServiceMapAgentBuilder({ agentBuilder });

    registerDataProviders({
      core: core as unknown as ApmToolCore,
      plugins: {
        observabilityAgentBuilder,
        apmDataAccess,
        // The tools resources only read this contract at start.
        ruleRegistry: ruleRegistry as never,
      },
      config: this.context.config.get(),
      logger: this.context.logger.get('observabilityAgentBuilder'),
    });
  }

  start() {}
}

export const plugin = async (context: PluginInitializerContext<APMConfig>) =>
  new ApmTasksPlugin(context);
