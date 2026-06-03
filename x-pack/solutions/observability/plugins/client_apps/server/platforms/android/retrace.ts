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

export async function retrace({
  esClient,
  stacktrace,
  buildId,
  logger,
}: RetraceParams): Promise<string> {
  const index = `android-r8-mappings-${buildId}`;

  const retracer = new RetracerAndroid(
    stacktrace,
    {
      fetch: async (classNames) => {
        const ids = classNames.map((cls) => crypto.createHash('sha256').update(cls).digest('hex'));
        const response = await esClient.mget<AndroidClassMap>({ index, ids });
        return response.docs
          .filter((doc) => 'found' in doc && doc.found && '_source' in doc)
          .map((doc) => (doc as { _source: AndroidClassMap })._source);
      },
    },
    { logger }
  );

  return (await retracer.retrace()) ?? stacktrace;
}
