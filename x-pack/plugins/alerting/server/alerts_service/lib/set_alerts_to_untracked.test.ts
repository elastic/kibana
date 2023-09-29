/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  ElasticsearchClientMock,
  elasticsearchServiceMock,
  loggingSystemMock,
} from '@kbn/core/server/mocks';
import { setAlertsToUntracked } from './set_alerts_to_untracked';

let clusterClient: ElasticsearchClientMock;
let logger: ReturnType<typeof loggingSystemMock['createLogger']>;

describe('setAlertsToUntracked()', () => {
  beforeEach(() => {
    logger = loggingSystemMock.createLogger();
    clusterClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
  });
  test('should call updateByQuery on provided ruleIds', async () => {
    await setAlertsToUntracked({
      logger,
      esClient: clusterClient,
      indices: ['test-index'],
      ruleIds: ['test-rule'],
    });

    expect(clusterClient.updateByQuery).toHaveBeenCalledTimes(1);
  });

  test('should retry updateByQuery on failure', async () => {
    clusterClient.updateByQuery.mockResponseOnce({
      total: 10,
      updated: 8,
    });

    await setAlertsToUntracked({
      logger,
      esClient: clusterClient,
      indices: ['test-index'],
      ruleIds: ['test-rule'],
    });

    expect(clusterClient.updateByQuery).toHaveBeenCalledTimes(2);
    expect(logger.warn).toHaveBeenCalledWith(
      'Attempt 1: Failed to untrack 2 of 10; indices test-index, ruleIds test-rule'
    );
  });
});
