/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TaskManagerSetupContract } from '../../../task_manager/server';
import { UsageCollectionSetup } from '../../../../../src/plugins/usage_collection/server';

interface CreateCasesTelemetryArgs {
  taskManager: TaskManagerSetupContract;
  usageCollection: UsageCollectionSetup;
}

export const createCasesTelemetry = async ({
  taskManager,
  usageCollection,
}: CreateCasesTelemetryArgs) => {};
