/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Logger } from '@kbn/core/server';
import type { StaticToolRegistration } from '@kbn/onechat-server';
import type { APMPluginStartDependencies, APMPluginSetupDependencies } from '../types';
import { createDownstreamDependenciesTool } from './get_downstream_dependencies';
import { createGetServicesTool } from './get_services';

export async function registerAgentTools({
  core,
  plugins,
  logger,
}: {
  core: CoreSetup<APMPluginStartDependencies>;
  plugins: APMPluginSetupDependencies;
  logger: Logger;
}) {
  const apmTools: StaticToolRegistration<any>[] = [
    createDownstreamDependenciesTool({ core, plugins, logger }),
    createGetServicesTool({ core, plugins, logger }),
  ];

  for (const tool of apmTools) {
    plugins.onechat?.tools.register(tool);
  }
}
