/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializerContext, TasksPlugin } from '@kbn/core/server';
import type { ApmSourcesAccessTasksSetup } from '@kbn/apm-sources-access-plugin/server/tasks';
import { createApmDataAccessSetup } from '../runtime';
import type { ApmDataAccessPluginSetup } from '../types';
import { apmDataAccessBridge } from './bridge';

export { config } from '../config';

export type ApmDataAccessTasksSetup = ApmDataAccessPluginSetup;

interface TasksSetupDeps {
  apmSourcesAccess: ApmSourcesAccessTasksSetup;
}

/**
 * APM data access for a task pod: the same APM indices and data services as the plugin's `server`
 * entry. In Kibana this entry hands out the plugin's own contract (see `bridge.ts`).
 */
class ApmDataAccessTasksPlugin implements TasksPlugin<ApmDataAccessTasksSetup, {}, TasksSetupDeps> {
  setup(_core: unknown, { apmSourcesAccess }: TasksSetupDeps): ApmDataAccessTasksSetup {
    return apmDataAccessBridge.getSetup() ?? createApmDataAccessSetup(apmSourcesAccess);
  }

  start() {
    return {};
  }
}

export const plugin = async (_context: PluginInitializerContext) => new ApmDataAccessTasksPlugin();
