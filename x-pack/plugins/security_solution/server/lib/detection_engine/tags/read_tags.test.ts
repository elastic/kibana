/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rulesClientMock } from '@kbn/alerting-plugin/server/mocks';

import { getRuleMock, getFindResultWithMultiHits } from '../routes/__mocks__/request_responses';
import { INTERNAL_RULE_ID_KEY, INTERNAL_IDENTIFIER } from '../../../../common/constants';
import { readRawTags, readTags, convertTagsToSet, convertToTags, isTags } from './read_tags';
import { getQueryRuleParams } from '../schemas/rule_schemas.mock';

describe('read_tags', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('readRawTags', () => {
    test('it should return the intersection of tags to where none are repeating', async () => {
      const result1 = getRuleMock(getQueryRuleParams());
      result1.id = '4baa53f8-96da-44ee-ad58-41bccb7f9f3d';
      result1.params.ruleId = 'rule-1';
      result1.tags = ['tag 1', 'tag 2', 'tag 3'];

      const result2 = getRuleMock(getQueryRuleParams());
      result2.id = '5baa53f8-96da-44ee-ad58-41bccb7f9f3d';
      result2.params.ruleId = 'rule-2';
      result2.tags = ['tag 1', 'tag 2', 'tag 3', 'tag 4'];

      const rulesClient = rulesClientMock.create();
      rulesClient.find.mockResolvedValue(getFindResultWithMultiHits({ data: [result1, result2] }));

      const tags = await readRawTags({ rulesClient });
      expect(tags).toEqual(['tag 1', 'tag 2', 'tag 3', 'tag 4']);
    });

    test('it should return the intersection of tags to where some are repeating values', async () => {
      const result1 = getRuleMock(getQueryRuleParams());
      result1.id = '4baa53f8-96da-44ee-ad58-41bccb7f9f3d';
      result1.params.ruleId = 'rule-1';
      result1.tags = ['tag 1', 'tag 2', 'tag 2', 'tag 3'];

      const result2 = getRuleMock(getQueryRuleParams());
      result2.id = '5baa53f8-96da-44ee-ad58-41bccb7f9f3d';
      result2.params.ruleId = 'rule-2';
      result2.tags = ['tag 1', 'tag 2', 'tag 2', 'tag 3', 'tag 4'];

      const rulesClient = rulesClientMock.create();
      rulesClient.find.mockResolvedValue(getFindResultWithMultiHits({ data: [result1, result2] }));

      const tags = await readRawTags({ rulesClient });
      expect(tags).toEqual(['tag 1', 'tag 2', 'tag 3', 'tag 4']);
    });

    test('it should work with no tags defined between two results', async () => {
      const result1 = getRuleMock(getQueryRuleParams());
      result1.id = '4baa53f8-96da-44ee-ad58-41bccb7f9f3d';
      result1.params.ruleId = 'rule-1';
      result1.tags = [];

      const result2 = getRuleMock(getQueryRuleParams());
      result2.id = '5baa53f8-96da-44ee-ad58-41bccb7f9f3d';
      result2.params.ruleId = 'rule-2';
      result2.tags = [];

      const rulesClient = rulesClientMock.create();
      rulesClient.find.mockResolvedValue(getFindResultWithMultiHits({ data: [result1, result2] }));

      const tags = await readRawTags({ rulesClient });
      expect(tags).toEqual([]);
    });

    test('it should work with a single tag which has repeating values in it', async () => {
      const result1 = getRuleMock(getQueryRuleParams());
      result1.id = '4baa53f8-96da-44ee-ad58-41bccb7f9f3d';
      result1.params.ruleId = 'rule-1';
      result1.tags = ['tag 1', 'tag 1', 'tag 1', 'tag 2'];

      const rulesClient = rulesClientMock.create();
      rulesClient.find.mockResolvedValue(getFindResultWithMultiHits({ data: [result1] }));

      const tags = await readRawTags({ rulesClient });
      expect(tags).toEqual(['tag 1', 'tag 2']);
    });

    test('it should work with a single tag which has empty tags', async () => {
      const result1 = getRuleMock(getQueryRuleParams());
      result1.id = '4baa53f8-96da-44ee-ad58-41bccb7f9f3d';
      result1.params.ruleId = 'rule-1';
      result1.tags = [];

      const rulesClient = rulesClientMock.create();
      rulesClient.find.mockResolvedValue(getFindResultWithMultiHits({ data: [result1] }));

      const tags = await readRawTags({ rulesClient });
      expect(tags).toEqual([]);
    });
  });

  describe('readTags', () => {
    test('it should return the intersection of tags to where none are repeating', async () => {
      const result1 = getRuleMock(getQueryRuleParams());
      result1.id = '4baa53f8-96da-44ee-ad58-41bccb7f9f3d';
      result1.params.ruleId = 'rule-1';
      result1.tags = ['tag 1', 'tag 2', 'tag 3'];

      const result2 = getRuleMock(getQueryRuleParams());
      result2.id = '5baa53f8-96da-44ee-ad58-41bccb7f9f3d';
      result2.params.ruleId = 'rule-2';
      result2.tags = ['tag 1', 'tag 2', 'tag 3', 'tag 4'];

      const rulesClient = rulesClientMock.create();
      rulesClient.find.mockResolvedValue(getFindResultWithMultiHits({ data: [result1, result2] }));

      const tags = await readTags({ rulesClient });
      expect(tags).toEqual(['tag 1', 'tag 2', 'tag 3', 'tag 4']);
    });

    test('it should return the intersection of tags to where some are repeating values', async () => {
      const result1 = getRuleMock(getQueryRuleParams());
      result1.id = '4baa53f8-96da-44ee-ad58-41bccb7f9f3d';
      result1.params.ruleId = 'rule-1';
      result1.tags = ['tag 1', 'tag 2', 'tag 2', 'tag 3'];

      const result2 = getRuleMock(getQueryRuleParams());
      result2.id = '5baa53f8-96da-44ee-ad58-41bccb7f9f3d';
      result2.params.ruleId = 'rule-2';
      result2.tags = ['tag 1', 'tag 2', 'tag 2', 'tag 3', 'tag 4'];

      const rulesClient = rulesClientMock.create();
      rulesClient.find.mockResolvedValue(getFindResultWithMultiHits({ data: [result1, result2] }));

      const tags = await readTags({ rulesClient });
      expect(tags).toEqual(['tag 1', 'tag 2', 'tag 3', 'tag 4']);
    });

    test('it should work with no tags defined between two results', async () => {
      const result1 = getRuleMock(getQueryRuleParams());
      result1.id = '4baa53f8-96da-44ee-ad58-41bccb7f9f3d';
      result1.params.ruleId = 'rule-1';
      result1.tags = [];

      const result2 = getRuleMock(getQueryRuleParams());
      result2.id = '5baa53f8-96da-44ee-ad58-41bccb7f9f3d';
      result2.params.ruleId = 'rule-2';
      result2.tags = [];

      const rulesClient = rulesClientMock.create();
      rulesClient.find.mockResolvedValue(getFindResultWithMultiHits({ data: [result1, result2] }));

      const tags = await readTags({ rulesClient });
      expect(tags).toEqual([]);
    });

    test('it should work with a single tag which has repeating values in it', async () => {
      const result1 = getRuleMock(getQueryRuleParams());
      result1.id = '4baa53f8-96da-44ee-ad58-41bccb7f9f3d';
      result1.params.ruleId = 'rule-1';
      result1.tags = ['tag 1', 'tag 1', 'tag 1', 'tag 2'];

      const rulesClient = rulesClientMock.create();
      rulesClient.find.mockResolvedValue(getFindResultWithMultiHits({ data: [result1] }));

      const tags = await readTags({ rulesClient });
      expect(tags).toEqual(['tag 1', 'tag 2']);
    });

    test('it should work with a single tag which has empty tags', async () => {
      const result1 = getRuleMock(getQueryRuleParams());
      result1.id = '4baa53f8-96da-44ee-ad58-41bccb7f9f3d';
      result1.params.ruleId = 'rule-1';
      result1.tags = [];

      const rulesClient = rulesClientMock.create();
      rulesClient.find.mockResolvedValue(getFindResultWithMultiHits({ data: [result1] }));

      const tags = await readTags({ rulesClient });
      expect(tags).toEqual([]);
    });

    test('it should filter out any __internal tags for things such as alert_id', async () => {
      const result1 = getRuleMock(getQueryRuleParams());
      result1.id = '4baa53f8-96da-44ee-ad58-41bccb7f9f3d';
      result1.params.ruleId = 'rule-1';
      result1.tags = [
        `${INTERNAL_IDENTIFIER}_some_value`,
        `${INTERNAL_RULE_ID_KEY}_some_value`,
        'tag 1',
      ];

      const rulesClient = rulesClientMock.create();
      rulesClient.find.mockResolvedValue(getFindResultWithMultiHits({ data: [result1] }));

      const tags = await readTags({ rulesClient });
      expect(tags).toEqual(['tag 1']);
    });

    test('it should filter out any __internal tags with two different results', async () => {
      const result1 = getRuleMock(getQueryRuleParams());
      result1.id = '4baa53f8-96da-44ee-ad58-41bccb7f9f3d';
      result1.params.ruleId = 'rule-1';
      result1.tags = [
        `${INTERNAL_IDENTIFIER}_some_value`,
        `${INTERNAL_RULE_ID_KEY}_some_value`,
        'tag 1',
        'tag 2',
        'tag 3',
        'tag 4',
        'tag 5',
      ];

      const result2 = getRuleMock(getQueryRuleParams());
      result2.id = '5baa53f8-96da-44ee-ad58-41bccb7f9f3d';
      result2.params.ruleId = 'rule-2';
      result2.tags = [
        `${INTERNAL_IDENTIFIER}_some_value`,
        `${INTERNAL_RULE_ID_KEY}_some_value`,
        'tag 1',
        'tag 2',
        'tag 3',
        'tag 4',
      ];

      const rulesClient = rulesClientMock.create();
      rulesClient.find.mockResolvedValue(getFindResultWithMultiHits({ data: [result1] }));

      const tags = await readTags({ rulesClient });
      expect(tags).toEqual(['tag 1', 'tag 2', 'tag 3', 'tag 4', 'tag 5']);
    });
  });

  describe('convertTagsToSet', () => {
    test('it should convert the intersection of two tag systems without duplicates', () => {
      const result1 = getRuleMock(getQueryRuleParams());
      result1.id = '4baa53f8-96da-44ee-ad58-41bccb7f9f3d';
      result1.params.ruleId = 'rule-1';
      result1.tags = ['tag 1', 'tag 2', 'tag 2', 'tag 3'];

      const result2 = getRuleMock(getQueryRuleParams());
      result2.id = '5baa53f8-96da-44ee-ad58-41bccb7f9f3d';
      result2.params.ruleId = 'rule-2';
      result2.tags = ['tag 1', 'tag 2', 'tag 2', 'tag 3', 'tag 4'];

      const findResult = getFindResultWithMultiHits({ data: [result1, result2] });
      const set = convertTagsToSet(findResult.data);
      expect(Array.from(set)).toEqual(['tag 1', 'tag 2', 'tag 3', 'tag 4']);
    });

    test('it should with with an empty array', () => {
      const set = convertTagsToSet([]);
      expect(Array.from(set)).toEqual([]);
    });
  });

  describe('convertToTags', () => {
    test('it should convert the two tag systems together with duplicates', () => {
      const result1 = getRuleMock(getQueryRuleParams());
      result1.id = '4baa53f8-96da-44ee-ad58-41bccb7f9f3d';
      result1.params.ruleId = 'rule-1';
      result1.tags = ['tag 1', 'tag 2', 'tag 2', 'tag 3'];

      const result2 = getRuleMock(getQueryRuleParams());
      result2.id = '5baa53f8-96da-44ee-ad58-41bccb7f9f3d';
      result2.params.ruleId = 'rule-2';
      result2.tags = ['tag 1', 'tag 2', 'tag 2', 'tag 3', 'tag 4'];

      const findResult = getFindResultWithMultiHits({ data: [result1, result2] });
      const tags = convertToTags(findResult.data);
      expect(tags).toEqual([
        'tag 1',
        'tag 2',
        'tag 2',
        'tag 3',
        'tag 1',
        'tag 2',
        'tag 2',
        'tag 3',
        'tag 4',
      ]);
    });

    test('it should filter out anything that is not a tag', () => {
      const result1 = getRuleMock(getQueryRuleParams());
      result1.id = '4baa53f8-96da-44ee-ad58-41bccb7f9f3d';
      result1.params.ruleId = 'rule-1';
      result1.tags = ['tag 1', 'tag 2', 'tag 2', 'tag 3'];

      const result2 = getRuleMock(getQueryRuleParams());
      result2.id = '99979e67-19a7-455f-b452-8eded6135716';
      result2.params.ruleId = 'rule-2';
      // @ts-expect-error
      delete result2.tags;

      const result3 = getRuleMock(getQueryRuleParams());
      result3.id = '5baa53f8-96da-44ee-ad58-41bccb7f9f3d';
      result3.params.ruleId = 'rule-2';
      result3.tags = ['tag 1', 'tag 2', 'tag 2', 'tag 3', 'tag 4'];

      const findResult = getFindResultWithMultiHits({ data: [result1, result2, result3] });
      const tags = convertToTags(findResult.data);
      expect(tags).toEqual([
        'tag 1',
        'tag 2',
        'tag 2',
        'tag 3',
        'tag 1',
        'tag 2',
        'tag 2',
        'tag 3',
        'tag 4',
      ]);
    });

    test('it should with with an empty array', () => {
      const tags = convertToTags([]);
      expect(tags).toEqual([]);
    });
  });

  describe('isTags', () => {
    test('it should return true if the object has a tags on it', () => {
      expect(isTags({ tags: [] })).toBe(true);
    });

    test('it should return false if the object does not have a tags on it', () => {
      expect(isTags({})).toBe(false);
    });
  });
});
