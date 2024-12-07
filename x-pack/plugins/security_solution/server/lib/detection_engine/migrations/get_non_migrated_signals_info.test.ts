/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';

import { getNonMigratedSignalsInfo } from './get_non_migrated_signals_info';
import { getIndexVersionsByIndex } from './get_index_versions_by_index';
import { getSignalVersionsByIndex } from './get_signal_versions_by_index';
import { getLatestIndexTemplateVersion } from './get_latest_index_template_version';
import { getIndexAliasPerSpace } from './get_index_alias_per_space';
import { getOldestSignalTimestamp } from './get_oldest_signal_timestamp';

jest.mock('./get_index_versions_by_index', () => ({ getIndexVersionsByIndex: jest.fn() }));
jest.mock('./get_signal_versions_by_index', () => ({ getSignalVersionsByIndex: jest.fn() }));
jest.mock('./get_latest_index_template_version', () => ({
  getLatestIndexTemplateVersion: jest.fn(),
}));
jest.mock('./get_index_alias_per_space', () => ({ getIndexAliasPerSpace: jest.fn() }));
jest.mock('./get_oldest_signal_timestamp', () => ({ getOldestSignalTimestamp: jest.fn() }));

const getIndexVersionsByIndexMock = getIndexVersionsByIndex as jest.Mock;
const getSignalVersionsByIndexMock = getSignalVersionsByIndex as jest.Mock;
const getLatestIndexTemplateVersionMock = getLatestIndexTemplateVersion as jest.Mock;
const getIndexAliasPerSpaceMock = getIndexAliasPerSpace as jest.Mock;
const getOldestSignalTimestampMock = getOldestSignalTimestamp as jest.Mock;

const TEMPLATE_VERSION = 77;
const OLDEST_SIGNAL = '2020-03-03T00:00:00.000Z';

describe('getNonMigratedSignalsInfo', () => {
  let esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;
  const logger = loggerMock.create();

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createElasticsearchClient();

    getLatestIndexTemplateVersionMock.mockReturnValue(TEMPLATE_VERSION);
    getIndexVersionsByIndexMock.mockReturnValue({
      '.siem-signals-another-1-legacy': 10,
      '.siem-signals-default-old-one': 42,
    });
    getSignalVersionsByIndexMock.mockReturnValue({
      '.siem-signals-another-1-legacy': [{ count: 2, version: 10 }],
    });
    getIndexAliasPerSpaceMock.mockReturnValue({
      '.siem-signals-another-1-legacy': {
        alias: '.siem-signals-another-1',
        indexName: '.siem-signals-another-1-legacy',
        space: 'another-1',
      },
      '.siem-signals-default-old-one': {
        alias: '.siem-signals-default',
        indexName: '.siem-signals-default-old-one',
        space: 'default',
      },
    });
    getOldestSignalTimestampMock.mockReturnValue(OLDEST_SIGNAL);
  });

  it('returns empty results if no siem indices found', async () => {
    getIndexAliasPerSpaceMock.mockReturnValue({});

    const result = await getNonMigratedSignalsInfo({
      esClient,
      signalsIndex: 'siem-signals',
      logger,
    });

    expect(result).toEqual({
      isMigrationRequired: false,
      spaces: [],
      indices: [],
    });
  });

  it('returns empty when error happens', async () => {
    getLatestIndexTemplateVersionMock.mockRejectedValueOnce(new Error('Test failure'));
    const debugSpy = jest.spyOn(logger, 'debug');

    const result = await getNonMigratedSignalsInfo({
      esClient,
      signalsIndex: 'siem-signals',
      logger,
    });

    expect(result).toEqual({
      isMigrationRequired: false,
      spaces: [],
      indices: [],
    });
    expect(debugSpy).toHaveBeenCalledWith(expect.stringContaining('Test failure'));
  });

  it('returns empty results if no siem indices or signals outdated', async () => {
    getIndexVersionsByIndexMock.mockReturnValue({
      '.siem-signals-another-1-legacy': TEMPLATE_VERSION,
      '.siem-signals-default-old-one': TEMPLATE_VERSION,
    });
    getSignalVersionsByIndexMock.mockReturnValue({
      '.siem-signals-another-1-legacy': [{ count: 2, version: TEMPLATE_VERSION }],
    });

    const result = await getNonMigratedSignalsInfo({
      esClient,
      signalsIndex: 'siem-signals',
      logger,
    });

    expect(result).toEqual({
      isMigrationRequired: false,
      spaces: [],
      indices: [],
    });
  });
  it('returns results for outdated index', async () => {
    getIndexVersionsByIndexMock.mockReturnValue({
      '.siem-signals-another-1-legacy': TEMPLATE_VERSION,
      '.siem-signals-default-old-one': 16,
    });
    getSignalVersionsByIndexMock.mockReturnValue({
      '.siem-signals-another-1-legacy': [{ count: 2, version: TEMPLATE_VERSION }],
    });

    const result = await getNonMigratedSignalsInfo({
      esClient,
      signalsIndex: 'siem-signals',
      logger,
    });

    expect(result).toEqual({
      fromRange: OLDEST_SIGNAL,
      indices: ['.siem-signals-default-old-one'],
      isMigrationRequired: true,
      spaces: ['default'],
    });
  });
  it('returns results for outdated signals in index', async () => {
    getIndexVersionsByIndexMock.mockReturnValue({
      '.siem-signals-another-1-legacy': TEMPLATE_VERSION,
      '.siem-signals-default-old-one': TEMPLATE_VERSION,
    });
    getSignalVersionsByIndexMock.mockReturnValue({
      '.siem-signals-another-1-legacy': [{ count: 2, version: 12 }],
    });

    const result = await getNonMigratedSignalsInfo({
      esClient,
      signalsIndex: 'siem-signals',
      logger,
    });

    expect(result).toEqual({
      fromRange: OLDEST_SIGNAL,
      indices: ['.siem-signals-another-1-legacy'],
      isMigrationRequired: true,
      spaces: ['another-1'],
    });
  });
  it('returns indices in multiple spaces', async () => {
    getIndexVersionsByIndexMock.mockReturnValue({
      '.siem-signals-another-1-legacy': 11,
      '.siem-signals-default-old-one': 11,
    });
    getSignalVersionsByIndexMock.mockReturnValue({
      '.siem-signals-another-1-legacy': [{ count: 2, version: 11 }],
    });

    const result = await getNonMigratedSignalsInfo({
      esClient,
      signalsIndex: 'siem-signals',
      logger,
    });

    expect(result).toEqual({
      fromRange: OLDEST_SIGNAL,
      indices: ['.siem-signals-another-1-legacy', '.siem-signals-default-old-one'],
      isMigrationRequired: true,
      spaces: ['another-1', 'default'],
    });
  });
});
