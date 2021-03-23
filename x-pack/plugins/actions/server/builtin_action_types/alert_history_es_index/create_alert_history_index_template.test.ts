/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from 'src/core/server';
import { RequestEvent } from '@elastic/elasticsearch';
import { elasticsearchServiceMock, loggingSystemMock } from 'src/core/server/mocks';
import { DeeplyMockedKeys } from '@kbn/utility-types/jest';
import {
  createAlertHistoryIndexTemplate,
  getAlertHistoryIndexTemplate,
} from './create_alert_history_index_template';

type MockedLogger = ReturnType<typeof loggingSystemMock['createLogger']>;

describe('createAlertHistoryIndexTemplate', () => {
  let logger: MockedLogger;
  let clusterClient: DeeplyMockedKeys<ElasticsearchClient>;

  beforeEach(() => {
    logger = loggingSystemMock.createLogger();
    clusterClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
  });

  test(`should create index template if it doesn't exist`, async () => {
    clusterClient.indices.existsTemplate.mockResolvedValue({
      body: false,
    } as RequestEvent<boolean>);

    await createAlertHistoryIndexTemplate({ client: clusterClient, logger });
    expect(clusterClient.indices.putTemplate).toHaveBeenCalledWith({
      name: `alert-history-template`,
      body: getAlertHistoryIndexTemplate(),
      create: true,
    });
  });

  test(`shouldn't create index template if it already exists`, async () => {
    clusterClient.indices.existsTemplate.mockResolvedValue({
      body: true,
    } as RequestEvent<boolean>);

    await createAlertHistoryIndexTemplate({ client: clusterClient, logger });
    expect(clusterClient.indices.putTemplate).not.toHaveBeenCalled();
  });
});
