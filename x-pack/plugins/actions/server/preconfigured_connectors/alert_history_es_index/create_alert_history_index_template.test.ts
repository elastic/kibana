/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import {
  createAlertHistoryIndexTemplate,
  getAlertHistoryIndexTemplate,
} from './create_alert_history_index_template';

type MockedLogger = ReturnType<typeof loggingSystemMock['createLogger']>;

describe('createAlertHistoryIndexTemplate', () => {
  let logger: MockedLogger;
  let clusterClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;

  beforeEach(() => {
    logger = loggingSystemMock.createLogger();
    clusterClient = elasticsearchServiceMock.createElasticsearchClient();
  });

  test(`should create index template if it doesn't exist`, async () => {
    clusterClient.indices.existsIndexTemplate.mockResponse(false);

    await createAlertHistoryIndexTemplate({ client: clusterClient, logger });
    expect(clusterClient.indices.putIndexTemplate).toHaveBeenCalledWith({
      name: `kibana-alert-history-template`,
      body: getAlertHistoryIndexTemplate(),
      create: true,
    });
  });

  test(`shouldn't create index template if it already exists`, async () => {
    clusterClient.indices.existsIndexTemplate.mockResponse(true);

    await createAlertHistoryIndexTemplate({ client: clusterClient, logger });
    expect(clusterClient.indices.putIndexTemplate).not.toHaveBeenCalled();
  });
});
