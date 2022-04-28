/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import type { DataRequestHandlerContext } from '@kbn/data-plugin/server';
import {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import {
  PluginSetup as DataPluginSetup,
  PluginStart as DataPluginStart,
} from '@kbn/data-plugin/server';
import { SecurityPluginSetup } from '@kbn/security-plugin/server';
import { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';

/**
 * @internal
 */
export type DataEnhancedRequestHandlerContext = DataRequestHandlerContext;

/**
 * @internal
 */
export type DataEnhancedPluginRouter = IRouter<DataRequestHandlerContext>;

export interface DataEnhancedSetupDependencies {
  data: DataPluginSetup;
  usageCollection?: UsageCollectionSetup;
  taskManager: TaskManagerSetupContract;
  security?: SecurityPluginSetup;
}

export interface DataEnhancedStartDependencies {
  data: DataPluginStart;
  taskManager: TaskManagerStartContract;
}
