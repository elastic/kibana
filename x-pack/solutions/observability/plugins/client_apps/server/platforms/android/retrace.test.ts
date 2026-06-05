/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import crypto from 'crypto';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { AndroidClassMap } from '../../lib/retracer_android';
import { RetraceMapNotFoundError, retrace } from './retrace';

function sha256(input: string) {
  return crypto.createHash('sha256').update(input).digest('hex');
}

function makeMget(docs: Array<{ found: boolean; _source?: AndroidClassMap }>) {
  return jest.fn().mockResolvedValue({ docs });
}

function makeEsClient(mget: jest.Mock) {
  return { mget } as any;
}

const BUILD_ID = 'test-build-id';

const simpleClassMap: AndroidClassMap = {
  schema_version: 1,
  obfuscated_class: 'f8',
  original_class: 'com.example.Crasher',
  source_file: 'Crasher.kt',
  methods: {
    b: {
      mappings: [{ obf_range: [1, 7], orig_range: [28, 28], method: 'deepCrash' }],
    },
  },
};

describe('retrace (Android ES fetcher)', () => {
  it('queries .android-r8-mappings-<buildId> with SHA-256 hashed class names', async () => {
    const mget = makeMget([{ found: true, _source: simpleClassMap }]);

    await retrace({
      esClient: makeEsClient(mget),
      stacktrace: '\tat f8.b(SourceFile:3)',
      buildId: BUILD_ID,
      logger: loggingSystemMock.createLogger(),
    });

    expect(mget).toHaveBeenCalledWith(
      expect.objectContaining({
        index: `.android-r8-mappings-${BUILD_ID}`,
        ids: [sha256('f8')],
      })
    );
  });

  it('retraces frames when mapping documents are found', async () => {
    const mget = makeMget([{ found: true, _source: simpleClassMap }]);

    const result = await retrace({
      esClient: makeEsClient(mget),
      stacktrace: '\tat f8.b(SourceFile:3)',
      buildId: BUILD_ID,
      logger: loggingSystemMock.createLogger(),
    });

    expect(result).toBe('\tat com.example.Crasher.deepCrash(Crasher.kt:28)');
  });

  it('returns the original stacktrace when no mapping documents are found', async () => {
    const mget = makeMget([{ found: false }]);
    const stacktrace = '\tat f8.b(SourceFile:3)';

    const result = await retrace({
      esClient: makeEsClient(mget),
      stacktrace,
      buildId: BUILD_ID,
      logger: loggingSystemMock.createLogger(),
    });

    expect(result).toBe(stacktrace);
  });

  it('throws RetraceMapNotFoundError when the mapping index does not exist (mget throws)', async () => {
    const indexNotFoundError = Object.assign(new Error('index_not_found_exception'), {
      meta: { body: { error: { type: 'index_not_found_exception' } } },
    });
    const mget = jest.fn().mockRejectedValue(indexNotFoundError);

    await expect(
      retrace({
        esClient: makeEsClient(mget),
        stacktrace: '\tat f8.b(SourceFile:3)',
        buildId: BUILD_ID,
        logger: loggingSystemMock.createLogger(),
      })
    ).rejects.toThrow(RetraceMapNotFoundError);
  });

  it('throws RetraceMapNotFoundError when mget returns index_not_found inline in docs (ES 8+ behavior)', async () => {
    // Real ES returns HTTP 200 with per-doc error objects rather than throwing
    const mget = jest.fn().mockResolvedValue({
      docs: [{ error: { type: 'index_not_found_exception' } }],
    });

    await expect(
      retrace({
        esClient: makeEsClient(mget),
        stacktrace: '\tat f8.b(SourceFile:3)',
        buildId: BUILD_ID,
        logger: loggingSystemMock.createLogger(),
      })
    ).rejects.toThrow(RetraceMapNotFoundError);
  });

  it('RetraceMapNotFoundError message includes the build ID', async () => {
    const indexNotFoundError = Object.assign(new Error('index_not_found_exception'), {
      meta: { body: { error: { type: 'index_not_found_exception' } } },
    });
    const mget = jest.fn().mockRejectedValue(indexNotFoundError);

    await expect(
      retrace({
        esClient: makeEsClient(mget),
        stacktrace: '\tat f8.b(SourceFile:3)',
        buildId: BUILD_ID,
        logger: loggingSystemMock.createLogger(),
      })
    ).rejects.toThrow(BUILD_ID);
  });

  it('logs a warning and returns the original stacktrace when mget throws a generic ES error', async () => {
    const mget = jest.fn().mockRejectedValue(new Error('ES unavailable'));
    const stacktrace = '\tat f8.b(SourceFile:3)';
    const logger = loggingSystemMock.createLogger();

    const result = await retrace({
      esClient: makeEsClient(mget),
      stacktrace,
      buildId: BUILD_ID,
      logger,
    });

    expect(result).toBe(stacktrace);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Failed to fetch R8 mappings')
    );
  });

  it('batches all unique classes from the stacktrace into a single mget', async () => {
    const mget = makeMget([]);

    await retrace({
      esClient: makeEsClient(mget),
      stacktrace: [
        'java.lang.RuntimeException: crash',
        '\tat f8.b(SourceFile:3)',
        '\tat f8.a(SourceFile:1)',
        '\tat i8.run(SourceFile:20)',
      ].join('\n'),
      buildId: BUILD_ID,
      logger: loggingSystemMock.createLogger(),
    });

    const { ids } = mget.mock.calls[0][0];
    // f8, i8, plus java.lang.RuntimeException from the exception header line
    expect(ids).toHaveLength(3);
    expect(ids).toContain(sha256('f8'));
    expect(ids).toContain(sha256('i8'));
  });

  it('filters out unfound docs from mget results', async () => {
    const mget = makeMget([{ found: false }, { found: true, _source: simpleClassMap }]);

    const result = await retrace({
      esClient: makeEsClient(mget),
      stacktrace: '\tat f8.b(SourceFile:3)',
      buildId: BUILD_ID,
      logger: loggingSystemMock.createLogger(),
    });

    expect(result).toBe('\tat com.example.Crasher.deepCrash(Crasher.kt:28)');
  });
});
