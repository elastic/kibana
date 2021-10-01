/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from 'kibana/server';
import type { DataRequestHandlerContext } from '../../../../src/plugins/data/server';
import { TaskManagerSetupContract, TaskManagerStartContract } from '../../task_manager/server';
import {
  PluginSetup as DataPluginSetup,
  PluginStart as DataPluginStart,
} from '../../../../src/plugins/data/server';
import { SecurityPluginSetup } from '../../security/server';
import { UsageCollectionSetup } from '../../../../src/plugins/usage_collection/server';

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
