/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { cacheGet, cacheSet, cacheHas } from './cache';
import { fetchJson, getResponseStream } from './requests';
import { streamToBuffer } from './streams';
import { ArchiveEntry, untarBuffer, unzipBuffer } from './extract';

const REGISTRY = process.env.REGISTRY || 'http://integrations-registry.app.elstc.co';

export async function fetchList() {
  return fetchJson(`${REGISTRY}/list`);
}

export async function fetchInfo(key: string) {
  return fetchJson(`${REGISTRY}/package/${key}`);
}

export async function getArchiveInfo(
  key: string,
  filter = (entry: ArchiveEntry): boolean => true
): Promise<string[]> {
  const archiveBuffer = await getOrFetchArchiveBuffer(key);
  const extract = key.endsWith('.zip') ? unzipBuffer : untarBuffer;

  const paths: string[] = [];
  const onEntry = (entry: ArchiveEntry) => {
    const { path, buffer } = entry;
    paths.push(path);
    if (cacheHas(path)) return;
    if (buffer) cacheSet(path, buffer);
  };

  await extract(archiveBuffer, filter, onEntry);

  return paths;
}

async function getOrFetchArchiveBuffer(key: string): Promise<Buffer> {
  if (!cacheHas(key)) {
    await getResponseStream(`${REGISTRY}/package/${key}`)
      .then(streamToBuffer)
      .then(buffer => cacheSet(key, buffer));
  }

  const buffer = cacheGet(key);
  if (!buffer) throw new Error(`no archive buffer for ${key}`);

  return buffer;
}
