/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Logger } from '@kbn/core/server';
import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import type { APMPluginSetupDependencies, APMPluginStartDependencies } from '../types';
import { createGetServicesTool } from './tools/get_services';

export const registerAgentBuilderTools = ({
  core,
  plugins,
  agentBuilder,
  logger,
}: {
  core: CoreSetup<APMPluginStartDependencies>;
  plugins: APMPluginSetupDependencies;
  agentBuilder: AgentBuilderPluginSetup;
  logger: Logger;
}) => {
  agentBuilder.tools.register(
    createGetServicesTool({
      core,
      plugins,
      logger,
    })
  );
};
