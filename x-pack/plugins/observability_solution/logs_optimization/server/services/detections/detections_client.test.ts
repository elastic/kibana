/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { loggerMock } from '@kbn/logging-mocks';
import { coreMock } from '@kbn/core/server/mocks';
import { GrokSimulator } from '../../lib/grok_simulator';
import { DetectionsClient } from './detections_client';

const mockLogDocument = {
  _index: 'logs-test.dataset-default',
  _source: {},
};

describe('DetectionClient class', () => {
  const logger = loggerMock.create();
  const coreStartMock = coreMock.createStart();
  const esClient = coreStartMock.elasticsearch.client.asInternalUser;

  let detectionsClient: DetectionsClient;

  beforeEach(() => {
    detectionsClient = DetectionsClient.create({
      logger,
      grokSimulator: new GrokSimulator(esClient),
    });
  });

  describe('#detectFrom', () => {
    it('should resolve a single ECS FieldMetadata instance by default', async () => {
      const detections = detectionsClient.detectFrom(mockLogDocument);
    });
  });
});
