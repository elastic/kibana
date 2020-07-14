/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { embeddablePluginMock } from '../../../../../../../src/plugins/embeddable/public/mocks';
import { createEmbeddable, findMatchingIndexPatterns } from './embedded_map_helpers';
import { createPortalNode } from 'react-reverse-portal';
import {
  mockAPMIndexPattern,
  mockAPMRegexIndexPattern,
  mockAPMTransactionIndexPattern,
  mockAuditbeatIndexPattern,
  mockFilebeatIndexPattern,
  mockGlobIndexPattern,
  mockCCSGlobIndexPattern,
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
        0,
        0,
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
        0,
        0,
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
        kibanaIndexPatterns: [mockAPMTransactionIndexPattern, mockFilebeatIndexPattern],
        siemDefaultIndices,
      });
      expect(matchingIndexPatterns).toEqual([
        mockAPMTransactionIndexPattern,
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
  });
});
