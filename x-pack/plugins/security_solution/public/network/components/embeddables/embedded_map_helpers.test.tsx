/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { embeddablePluginMock } from '@kbn/embeddable-plugin/public/mocks';
import { createEmbeddable, findMatchingIndexPatterns } from './embedded_map_helpers';
import { createPortalNode } from 'react-reverse-portal';
import {
  mockAPMIndexPattern,
  mockAPMRegexIndexPattern,
  mockAPMTransactionIndexPattern,
  mockAPMTracesDataStreamIndexPattern,
  mockAuditbeatIndexPattern,
  mockCCSGlobIndexPattern,
  mockCommaFilebeatAuditbeatCCSGlobIndexPattern,
  mockCommaFilebeatAuditbeatGlobIndexPattern,
  mockCommaFilebeatExclusionGlobIndexPattern,
  mockFilebeatIndexPattern,
  mockGlobIndexPattern,
} from './__mocks__/mock';

const mockEmbeddable = embeddablePluginMock.createStartContract();

mockEmbeddable.getEmbeddableFactory = jest.fn().mockImplementation(() => ({
  create: () => ({
    reload: jest.fn(),
    setRenderTooltipContent: jest.fn(),
    setLayerList: jest.fn(),
  }),
}));

describe('embedded_map_helpers', () => {
  describe('createEmbeddable', () => {
    test('attaches refresh action', async () => {
      const setQueryMock = jest.fn();
      await createEmbeddable(
        [],
        [],
        { query: '', language: 'kuery' },
        '2020-07-07T08:20:18.966Z',
        '2020-07-08T08:20:18.966Z',
        setQueryMock,
        createPortalNode(),
        mockEmbeddable
      );
      expect(setQueryMock).toHaveBeenCalledTimes(1);
    });

    test('attaches refresh action with correct reference', async () => {
      const setQueryMock = jest.fn(({ id, inspect, loading, refetch }) => refetch);
      const embeddable = await createEmbeddable(
        [],
        [],
        { query: '', language: 'kuery' },
        '2020-07-07T08:20:18.966Z',
        '2020-07-08T08:20:18.966Z',
        setQueryMock,
        createPortalNode(),
        mockEmbeddable
      );
      expect(setQueryMock.mock.calls[0][0].refetch).not.toBe(embeddable.reload);
      setQueryMock.mock.results[0].value();
      expect(embeddable.reload).toHaveBeenCalledTimes(1);
    });
  });

  describe('findMatchingIndexPatterns', () => {
    const siemDefaultIndices = [
      'apm-*-transaction*',
      'traces-apm*',
      'auditbeat-*',
      'endgame-*',
      'filebeat-*',
      'packetbeat-*',
      'winlogbeat-*',
    ];

    test('finds exact matching index patterns ', () => {
      const matchingIndexPatterns = findMatchingIndexPatterns({
        kibanaIndexPatterns: [mockFilebeatIndexPattern, mockAuditbeatIndexPattern],
        siemDefaultIndices,
      });
      expect(matchingIndexPatterns).toEqual([mockFilebeatIndexPattern, mockAuditbeatIndexPattern]);
    });

    test('finds glob-matched index patterns ', () => {
      const matchingIndexPatterns = findMatchingIndexPatterns({
        kibanaIndexPatterns: [mockAPMIndexPattern, mockFilebeatIndexPattern],
        siemDefaultIndices,
      });
      expect(matchingIndexPatterns).toEqual([mockAPMIndexPattern, mockFilebeatIndexPattern]);
    });

    test('does not find glob-matched index pattern containing regex', () => {
      const matchingIndexPatterns = findMatchingIndexPatterns({
        kibanaIndexPatterns: [mockAPMRegexIndexPattern, mockFilebeatIndexPattern],
        siemDefaultIndices,
      });
      expect(matchingIndexPatterns).toEqual([mockFilebeatIndexPattern]);
    });

    test('finds exact glob-matched index patterns ', () => {
      const matchingIndexPatterns = findMatchingIndexPatterns({
        kibanaIndexPatterns: [
          mockAPMTransactionIndexPattern,
          mockAPMTracesDataStreamIndexPattern,
          mockFilebeatIndexPattern,
        ],
        siemDefaultIndices,
      });
      expect(matchingIndexPatterns).toEqual([
        mockAPMTransactionIndexPattern,
        mockAPMTracesDataStreamIndexPattern,
        mockFilebeatIndexPattern,
      ]);
    });

    test('excludes glob-only index patterns', () => {
      const matchingIndexPatterns = findMatchingIndexPatterns({
        kibanaIndexPatterns: [mockGlobIndexPattern, mockFilebeatIndexPattern],
        siemDefaultIndices,
      });
      expect(matchingIndexPatterns).toEqual([mockFilebeatIndexPattern]);
    });

    test('excludes glob-only CCS index patterns', () => {
      const matchingIndexPatterns = findMatchingIndexPatterns({
        kibanaIndexPatterns: [mockCCSGlobIndexPattern, mockFilebeatIndexPattern],
        siemDefaultIndices,
      });
      expect(matchingIndexPatterns).toEqual([mockFilebeatIndexPattern]);
    });

    test('matches on comma separated Kibana index pattern', () => {
      const matchingIndexPatterns = findMatchingIndexPatterns({
        kibanaIndexPatterns: [
          mockCommaFilebeatAuditbeatGlobIndexPattern,
          mockAuditbeatIndexPattern,
        ],
        siemDefaultIndices,
      });
      expect(matchingIndexPatterns).toEqual([
        mockCommaFilebeatAuditbeatGlobIndexPattern,
        mockAuditbeatIndexPattern,
      ]);
    });

    test('matches on excluded comma separated Kibana index pattern', () => {
      const matchingIndexPatterns = findMatchingIndexPatterns({
        kibanaIndexPatterns: [
          mockCommaFilebeatExclusionGlobIndexPattern,
          mockAuditbeatIndexPattern,
        ],
        siemDefaultIndices,
      });
      expect(matchingIndexPatterns).toEqual([
        mockCommaFilebeatExclusionGlobIndexPattern,
        mockAuditbeatIndexPattern,
      ]);
    });

    test('matches on CCS comma separated Kibana index pattern', () => {
      const matchingIndexPatterns = findMatchingIndexPatterns({
        kibanaIndexPatterns: [
          mockCommaFilebeatAuditbeatCCSGlobIndexPattern,
          mockAuditbeatIndexPattern,
        ],
        siemDefaultIndices: ['cluster2:filebeat-*', 'cluster1:auditbeat-*'],
      });
      expect(matchingIndexPatterns).toEqual([mockCommaFilebeatAuditbeatCCSGlobIndexPattern]);
    });
  });
});
