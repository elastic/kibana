/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { registerVisualizationsCollector } from './visualizations/register_usage_collector';
import { UsageCollectionSetup } from '../../../../../../src/plugins/usage_collection/server';
import { TaskManagerStartContract } from '../../../../task_manager/server';

export function registerCollectors(
  usageCollection: UsageCollectionSetup,
  taskManager: Promise<TaskManagerStartContract>
) {
  registerVisualizationsCollector(usageCollection, taskManager);
}
