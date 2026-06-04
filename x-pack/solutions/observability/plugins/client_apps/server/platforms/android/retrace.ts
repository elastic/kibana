/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import crypto from 'crypto';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { AndroidClassMap } from '../../lib/retracer_android';
import { RetracerAndroid } from '../../lib/retracer_android';

interface RetraceParams {
  esClient: ElasticsearchClient;
  stacktrace: string;
  buildId: string;
  logger: Logger;
}

export class RetraceMapNotFoundError extends Error {
  constructor(buildId: string) {
    super(
      `No R8 mapping found for build ID "${buildId}". Upload the app's R8 mapping before retracing.`
    );
    this.name = 'RetraceMapNotFoundError';
  }
}

function isIndexNotFoundError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const meta = (err as { meta?: { body?: { error?: { type?: string } } } }).meta;
  return meta?.body?.error?.type === 'index_not_found_exception';
}

export async function retrace({
  esClient,
  stacktrace,
  buildId,
  logger,
}: RetraceParams): Promise<string> {
  const index = `.android-r8-mappings-${buildId}`;
  let fetchError: unknown;

  const retracer = new RetracerAndroid(
    stacktrace,
    {
      fetch: async (classNames) => {
        const ids = classNames.map((cls) => crypto.createHash('sha256').update(cls).digest('hex'));
        try {
          const response = await esClient.mget<AndroidClassMap>({ index, ids });
          return response.docs
            .filter((doc) => 'found' in doc && doc.found && '_source' in doc)
            .map((doc) => (doc as { _source: AndroidClassMap })._source);
        } catch (err) {
          fetchError = err;
          throw err; // RetracerAndroid catches this and returns the original stacktrace
        }
      },
    },
    { logger }
  );

  const result = await retracer.retrace();

  if (fetchError !== undefined) {
    if (isIndexNotFoundError(fetchError)) {
      throw new RetraceMapNotFoundError(buildId);
    }
    logger.warn(
      `Failed to fetch R8 mappings for build ID "${buildId}": ${
        fetchError instanceof Error ? fetchError.message : String(fetchError)
      }`
    );
    return stacktrace;
  }

  return result ?? stacktrace;
}
