/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rulesClientMock } from '@kbn/alerting-plugin/server/mocks';
import { readTags } from './read_tags';

describe('read_tags', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('readTags', () => {
    test('it should return tags from the aggregation', async () => {
      const rulesClient = rulesClientMock.create();
      rulesClient.aggregate.mockResolvedValue({
        alertExecutionStatus: {},
        ruleLastRunOutcome: {},
        ruleTags: ['tag 1', 'tag 2', 'tag 3', 'tag 4'],
      });

      const tags = await readTags({ rulesClient });
      expect(tags).toEqual(['tag 1', 'tag 2', 'tag 3', 'tag 4']);
    });
  });
});
