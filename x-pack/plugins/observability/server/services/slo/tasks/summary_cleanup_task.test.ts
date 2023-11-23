/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SloSummaryCleanupTask } from './summary_cleanup_task';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';

import { loggerMock } from '@kbn/logging-mocks';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';

const taskManagerSetup = taskManagerMock.createSetup();
const taskManagerStart = taskManagerMock.createStart();
const logger = loggerMock.create();
const soClient = savedObjectsClientMock.create();
const esClient = elasticsearchClientMock.createClusterClient().asInternalUser;

describe('SloSummaryCleanupTask', () => {
  it('should ', function () {
    const task = new SloSummaryCleanupTask(taskManagerSetup, logger);
    await task.start(taskManagerStart, soClient);
  });
});
