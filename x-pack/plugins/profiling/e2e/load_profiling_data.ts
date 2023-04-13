/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import globby from 'globby';
import path from 'path';
import fs from 'fs';
import { createEsClientForTesting } from '@kbn/test';

const esArchiversPath = path.posix.join(__dirname, 'es_archivers');

export async function loadProfilingData({
  esNode,
  esRequestTimeout,
}: {
  esNode: string;
  esRequestTimeout: number;
}) {
  // eslint-disable-next-line no-console
  console.log('Loading Universal profiling data...');
  const client = createEsClientForTesting({
    esUrl: esNode,
    requestTimeout: esRequestTimeout,
    isCloud: true,
  });

  const dataAsArray = globby.sync('*', { cwd: esArchiversPath }).flatMap((fileName) => {
    const content = fs.readFileSync(`${esArchiversPath}/${fileName}`, 'utf8');
    return content.split('\n');
  });

  await client.bulk({ operations: dataAsArray, refresh: 'wait_for' });
  // eslint-disable-next-line no-console
  console.log('[Done] Loading Universal profiling data.');
}
