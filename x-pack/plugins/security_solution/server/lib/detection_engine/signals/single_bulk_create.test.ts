/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { generateId } from './utils';
import {
  sampleRuleAlertParams,
  sampleDocSearchResultsNoSortId,
  mockLogger,
  sampleRuleGuid,
  sampleDocSearchResultsNoSortIdNoVersion,
  sampleEmptyDocSearchResults,
  sampleBulkCreateDuplicateResult,
  sampleBulkCreateErrorResult,
  sampleDocWithAncestors,
} from './__mocks__/es_results';
import { DEFAULT_SIGNALS_INDEX } from '../../../../common/constants';
import { singleBulkCreate, filterDuplicateRules } from './single_bulk_create';
import { alertsMock, AlertServicesMock } from '../../../../../alerts/server/mocks';

describe('singleBulkCreate', () => {
  const mockService: AlertServicesMock = alertsMock.createAlertServices();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create signal id gereateId', () => {
    test('two docs with same index, id, and version should have same id', () => {
      const findex = 'myfakeindex';
      const fid = 'somefakeid';
      const version = '1';
      const ruleId = 'rule-1';
      // 'myfakeindexsomefakeid1rule-1'
      const generatedHash = '342404d620be4344d6d90dd0461d1d1848aec457944d5c5f40cc0cbfedb36679';
      const firstHash = generateId(findex, fid, version, ruleId);
      const secondHash = generateId(findex, fid, version, ruleId);
      expect(firstHash).toEqual(generatedHash);
      expect(secondHash).toEqual(generatedHash);
      expect(Buffer.byteLength(firstHash, 'utf8')).toBeLessThan(512); // 512 bytes is maximum size of _id field
      expect(Buffer.byteLength(secondHash, 'utf8')).toBeLessThan(512);
    });
    test('two docs with different index, id, and version should have different id', () => {
      const findex = 'myfakeindex';
      const findex2 = 'mysecondfakeindex';
      const fid = 'somefakeid';
      const version = '1';
      const ruleId = 'rule-1';
      // 'myfakeindexsomefakeid1rule-1'
      const firstGeneratedHash = '342404d620be4344d6d90dd0461d1d1848aec457944d5c5f40cc0cbfedb36679';
      // 'mysecondfakeindexsomefakeid1rule-1'
      const secondGeneratedHash =
        'a852941273f805ffe9006e574601acc8ae1148d6c0b3f7f8c4785cba8f6b768a';
      const firstHash = generateId(findex, fid, version, ruleId);
      const secondHash = generateId(findex2, fid, version, ruleId);
      expect(firstHash).toEqual(firstGeneratedHash);
      expect(secondHash).toEqual(secondGeneratedHash);
      expect(Buffer.byteLength(firstHash, 'utf8')).toBeLessThan(512); // 512 bytes is maximum size of _id field
      expect(Buffer.byteLength(secondHash, 'utf8')).toBeLessThan(512);
      expect(firstHash).not.toEqual(secondHash);
    });
    test('two docs with same index, different id, and same version should have different id', () => {
      const findex = 'myfakeindex';
      const fid = 'somefakeid';
      const fid2 = 'somefakeid2';
      const version = '1';
      const ruleId = 'rule-1';
      // 'myfakeindexsomefakeid1rule-1'
      const firstGeneratedHash = '342404d620be4344d6d90dd0461d1d1848aec457944d5c5f40cc0cbfedb36679';
      // 'myfakeindexsomefakeid21rule-1'
      const secondGeneratedHash =
        '7d33faea18159fd010c4b79890620e8b12cdc88ec1d370149d0e5552ce860255';
      const firstHash = generateId(findex, fid, version, ruleId);
      const secondHash = generateId(findex, fid2, version, ruleId);
      expect(firstHash).toEqual(firstGeneratedHash);
      expect(secondHash).toEqual(secondGeneratedHash);
      expect(Buffer.byteLength(firstHash, 'utf8')).toBeLessThan(512); // 512 bytes is maximum size of _id field
      expect(Buffer.byteLength(secondHash, 'utf8')).toBeLessThan(512);
      expect(firstHash).not.toEqual(secondHash);
    });
    test('two docs with same index, same id, and different version should have different id', () => {
      const findex = 'myfakeindex';
      const fid = 'somefakeid';
      const version = '1';
      const version2 = '2';
      const ruleId = 'rule-1';
      // 'myfakeindexsomefakeid1rule-1'
      const firstGeneratedHash = '342404d620be4344d6d90dd0461d1d1848aec457944d5c5f40cc0cbfedb36679';
      // myfakeindexsomefakeid2rule-1'
      const secondGeneratedHash =
        'f016f3071fa9df9221d2fb2ba92389d4d388a4347c6ec7a4012c01cb1c640a40';
      const firstHash = generateId(findex, fid, version, ruleId);
      const secondHash = generateId(findex, fid, version2, ruleId);
      expect(firstHash).toEqual(firstGeneratedHash);
      expect(secondHash).toEqual(secondGeneratedHash);
      expect(Buffer.byteLength(firstHash, 'utf8')).toBeLessThan(512); // 512 bytes is maximum size of _id field
      expect(Buffer.byteLength(secondHash, 'utf8')).toBeLessThan(512);
      expect(firstHash).not.toEqual(secondHash);
    });
    test('Ensure generated id is less than 512 bytes, even for really really long strings', () => {
      const longIndexName =
        'myfakeindexmyfakeindexmyfakeindexmyfakeindexmyfakeindexmyfakeindexmyfakeindexmyfakeindexmyfakeindexmyfakeindexmyfakeindexmyfakeindexmyfakeindexmyfakeindexmyfakeindexmyfakeindexmyfakeindexmyfakeindexmyfakeindexmyfakeindexmyfakeindexmyfakeindexmyfakeindexmyfakeindexmyfakeindexmyfakeindexmyfakeindexmyfakeindexmyfakeindexmyfakeindexmyfakeindexmyfakeindexmyfakeindexmyfakeindexmyfakeindexmyfakeindexmyfakeindexmyfakeindexmyfakeindexmyfakeindexmyfakeindexmyfakeindexmyfakeindexmyfakeindexmyfakeindexmyfakeindexmyfakeindexmyfakeindexmyfakeindexmyfakeindexmyfakeindexmyfakeindexmyfakeindexmyfakeindexmyfakeindexmyfakeindexmyfakeindexmyfakeindexmyfakeindexmyfakeindexmyfakeindexmyfakeindexmyfakeindexmyfakeindexmyfakeindexmyfakeindexmyfakeindexmyfakeindexmyfakeindexmyfakeindex';
      const fid = 'somefakeid';
      const version = '1';
      const ruleId = 'rule-1';
      const firstHash = generateId(longIndexName, fid, version, ruleId);
      expect(Buffer.byteLength(firstHash, 'utf8')).toBeLessThan(512); // 512 bytes is maximum size of _id field
    });
    test('two docs with same index, same id, same version number, and different rule ids should have different id', () => {
      const findex = 'myfakeindex';
      const fid = 'somefakeid';
      const version = '1';
      const ruleId = 'rule-1';
      const ruleId2 = 'rule-2';
      // 'myfakeindexsomefakeid1rule-1'
      const firstGeneratedHash = '342404d620be4344d6d90dd0461d1d1848aec457944d5c5f40cc0cbfedb36679';
      // myfakeindexsomefakeid1rule-2'
      const secondGeneratedHash =
        '1eb04f997086f8b3b143d4d9b18ac178c4a7423f71a5dad9ba8b9e92603c6863';
      const firstHash = generateId(findex, fid, version, ruleId);
      const secondHash = generateId(findex, fid, version, ruleId2);
      expect(firstHash).toEqual(firstGeneratedHash);
      expect(secondHash).toEqual(secondGeneratedHash);
      expect(Buffer.byteLength(firstHash, 'utf8')).toBeLessThan(512); // 512 bytes is maximum size of _id field
      expect(Buffer.byteLength(secondHash, 'utf8')).toBeLessThan(512);
      expect(firstHash).not.toEqual(secondHash);
    });
  });

  test('create successful bulk create', async () => {
    const sampleParams = sampleRuleAlertParams();
    mockService.callCluster.mockResolvedValueOnce({
      took: 100,
      errors: false,
      items: [
        {
          fakeItemValue: 'fakeItemKey',
        },
      ],
    });
    const { success, createdItemsCount } = await singleBulkCreate({
      filteredEvents: sampleDocSearchResultsNoSortId(),
      ruleParams: sampleParams,
      services: mockService,
      logger: mockLogger,
      id: sampleRuleGuid,
      signalsIndex: DEFAULT_SIGNALS_INDEX,
      actions: [],
      name: 'rule-name',
      createdAt: '2020-01-28T15:58:34.810Z',
      updatedAt: '2020-01-28T15:59:14.004Z',
      createdBy: 'elastic',
      updatedBy: 'elastic',
      interval: '5m',
      enabled: true,
      refresh: false,
      tags: ['some fake tag 1', 'some fake tag 2'],
      throttle: 'no_actions',
    });
    expect(success).toEqual(true);
    expect(createdItemsCount).toEqual(0);
  });

  test('create successful bulk create with docs with no versioning', async () => {
    const sampleParams = sampleRuleAlertParams();
    mockService.callCluster.mockResolvedValueOnce({
      took: 100,
      errors: false,
      items: [
        {
          fakeItemValue: 'fakeItemKey',
        },
      ],
    });
    const { success, createdItemsCount } = await singleBulkCreate({
      filteredEvents: sampleDocSearchResultsNoSortIdNoVersion(),
      ruleParams: sampleParams,
      services: mockService,
      logger: mockLogger,
      id: sampleRuleGuid,
      signalsIndex: DEFAULT_SIGNALS_INDEX,
      name: 'rule-name',
      actions: [],
      createdAt: '2020-01-28T15:58:34.810Z',
      updatedAt: '2020-01-28T15:59:14.004Z',
      createdBy: 'elastic',
      updatedBy: 'elastic',
      interval: '5m',
      enabled: true,
      refresh: false,
      tags: ['some fake tag 1', 'some fake tag 2'],
      throttle: 'no_actions',
    });
    expect(success).toEqual(true);
    expect(createdItemsCount).toEqual(0);
  });

  test('create unsuccessful bulk create due to empty search results', async () => {
    const sampleParams = sampleRuleAlertParams();
    mockService.callCluster.mockResolvedValue(false);
    const { success, createdItemsCount } = await singleBulkCreate({
      filteredEvents: sampleEmptyDocSearchResults(),
      ruleParams: sampleParams,
      services: mockService,
      logger: mockLogger,
      id: sampleRuleGuid,
      signalsIndex: DEFAULT_SIGNALS_INDEX,
      name: 'rule-name',
      actions: [],
      createdAt: '2020-01-28T15:58:34.810Z',
      updatedAt: '2020-01-28T15:59:14.004Z',
      createdBy: 'elastic',
      updatedBy: 'elastic',
      interval: '5m',
      enabled: true,
      refresh: false,
      tags: ['some fake tag 1', 'some fake tag 2'],
      throttle: 'no_actions',
    });
    expect(success).toEqual(true);
    expect(createdItemsCount).toEqual(0);
  });

  test('create successful bulk create when bulk create has duplicate errors', async () => {
    const sampleParams = sampleRuleAlertParams();
    const sampleSearchResult = sampleDocSearchResultsNoSortId;
    mockService.callCluster.mockResolvedValue(sampleBulkCreateDuplicateResult);
    const { success, createdItemsCount } = await singleBulkCreate({
      filteredEvents: sampleSearchResult(),
      ruleParams: sampleParams,
      services: mockService,
      logger: mockLogger,
      id: sampleRuleGuid,
      signalsIndex: DEFAULT_SIGNALS_INDEX,
      name: 'rule-name',
      actions: [],
      createdAt: '2020-01-28T15:58:34.810Z',
      updatedAt: '2020-01-28T15:59:14.004Z',
      createdBy: 'elastic',
      updatedBy: 'elastic',
      interval: '5m',
      enabled: true,
      refresh: false,
      tags: ['some fake tag 1', 'some fake tag 2'],
      throttle: 'no_actions',
    });

    expect(mockLogger.error).not.toHaveBeenCalled();
    expect(success).toEqual(true);
    expect(createdItemsCount).toEqual(1);
  });

  test('create successful bulk create when bulk create has multiple error statuses', async () => {
    const sampleParams = sampleRuleAlertParams();
    const sampleSearchResult = sampleDocSearchResultsNoSortId;
    mockService.callCluster.mockResolvedValue(sampleBulkCreateErrorResult);
    const { success, createdItemsCount } = await singleBulkCreate({
      filteredEvents: sampleSearchResult(),
      ruleParams: sampleParams,
      services: mockService,
      logger: mockLogger,
      id: sampleRuleGuid,
      signalsIndex: DEFAULT_SIGNALS_INDEX,
      name: 'rule-name',
      actions: [],
      createdAt: '2020-01-28T15:58:34.810Z',
      updatedAt: '2020-01-28T15:59:14.004Z',
      createdBy: 'elastic',
      updatedBy: 'elastic',
      interval: '5m',
      enabled: true,
      refresh: false,
      tags: ['some fake tag 1', 'some fake tag 2'],
      throttle: 'no_actions',
    });

    expect(mockLogger.error).toHaveBeenCalled();
    expect(success).toEqual(true);
    expect(createdItemsCount).toEqual(1);
  });

  test('filter duplicate rules will return an empty array given an empty array', () => {
    const filtered = filterDuplicateRules(
      '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
      sampleEmptyDocSearchResults()
    );
    expect(filtered).toEqual([]);
  });

  test('filter duplicate rules will return nothing filtered when the two rule ids do not match with each other', () => {
    const filtered = filterDuplicateRules('some id', sampleDocWithAncestors());
    expect(filtered).toEqual([
      {
        _index: 'myFakeSignalIndex',
        _type: 'doc',
        _score: 100,
        _version: 1,
        _id: 'e1e08ddc-5e37-49ff-a258-5393aa44435a',
        _source: {
          someKey: 'someValue',
          '@timestamp': '2020-04-20T21:27:45+0000',
          signal: {
            parent: {
              rule: '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
              id: 'd5e8eb51-a6a0-456d-8a15-4b79bfec3d71',
              type: 'event',
              index: 'myFakeSignalIndex',
              depth: 1,
            },
            ancestors: [
              {
                rule: '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
                id: 'd5e8eb51-a6a0-456d-8a15-4b79bfec3d71',
                type: 'event',
                index: 'myFakeSignalIndex',
                depth: 1,
              },
            ],
          },
        },
      },
    ]);
  });

  test('filters duplicate rules will return empty array when the two rule ids match each other', () => {
    const filtered = filterDuplicateRules(
      '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
      sampleDocWithAncestors()
    );
    expect(filtered).toEqual([]);
  });

  test('filter duplicate rules will return back search responses if they do not have a signal and will NOT filter the source out', () => {
    const ancestors = sampleDocWithAncestors();
    ancestors.hits.hits[0]._source = { '@timestamp': '2020-04-20T21:27:45+0000' };
    const filtered = filterDuplicateRules('04128c15-0d1b-4716-a4c5-46997ac7f3bd', ancestors);
    expect(filtered).toEqual([
      {
        _index: 'myFakeSignalIndex',
        _type: 'doc',
        _score: 100,
        _version: 1,
        _id: 'e1e08ddc-5e37-49ff-a258-5393aa44435a',
        _source: { '@timestamp': '2020-04-20T21:27:45+0000' },
      },
    ]);
  });

  test('create successful and returns proper createdItemsCount', async () => {
    const sampleParams = sampleRuleAlertParams();
    mockService.callCluster.mockResolvedValue(sampleBulkCreateDuplicateResult);
    const { success, createdItemsCount } = await singleBulkCreate({
      filteredEvents: sampleDocSearchResultsNoSortId(),
      ruleParams: sampleParams,
      services: mockService,
      logger: mockLogger,
      id: sampleRuleGuid,
      signalsIndex: DEFAULT_SIGNALS_INDEX,
      actions: [],
      name: 'rule-name',
      createdAt: '2020-01-28T15:58:34.810Z',
      updatedAt: '2020-01-28T15:59:14.004Z',
      createdBy: 'elastic',
      updatedBy: 'elastic',
      interval: '5m',
      enabled: true,
      refresh: false,
      tags: ['some fake tag 1', 'some fake tag 2'],
      throttle: 'no_actions',
    });
    expect(success).toEqual(true);
    expect(createdItemsCount).toEqual(1);
  });
});
