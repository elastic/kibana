/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import http from 'http';
import https from 'https';
import Boom from 'boom';
import yauzl, { Entry, ZipFile } from 'yauzl';
import { Readable } from 'stream';
// import { decompress } from './decompress';

const REGISTRY = process.env.REGISTRY || 'http://localhost:8080';
const unzipFromBuffer = (buffer: Buffer): Promise<ZipFile> =>
  new Promise((resolve, reject) =>
    yauzl.fromBuffer(buffer, { lazyEntries: true }, (err?: Error, zipfile?: ZipFile) =>
      err ? reject(err) : resolve(zipfile)
    )
  );

export async function fetchList() {
  return fetchJson(`${REGISTRY}/list`);
}

export async function fetchInfo(key: string) {
  return fetchJson(`${REGISTRY}/package/${key}`);
}

function fetchUrl(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;

    const request = lib.get(url, response => {
      const body: string[] = [];
      response.on('data', (chunk: string) => body.push(chunk));
      response.on('end', () => resolve(body.join('')));
    });

    request.on('error', reject);
  });
}

async function fetchJson(url: string): Promise<object> {
  try {
    const json = await fetchUrl(url);
    const data = JSON.parse(json);
    return data;
  } catch (e) {
    throw e;
  }
}

async function fetchZipAsBuffer(key: string): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    http.get(`${REGISTRY}/package/${key}/get`, res => {
      const chunks: Buffer[] = [];
      res
        .on('data', chunk => chunks.push(Buffer.from(chunk)))
        .on('end', () => resolve(Buffer.concat(chunks)))
        .on('error', reject);
    })
  );
}

const rejectUnless200 = async (response: http.IncomingMessage) =>
  response.statusCode && response.statusCode === 200
    ? response
    : new Boom(response.statusMessage, { statusCode: response.statusCode });

const cache: Map<string, Buffer> = new Map();
const cacheGet = (key: string) => cache.get(key);
const cacheSet = (key: string, value: Buffer) => cache.set(key, value);
const cacheHas = (key: string) => cache.has(key);
const cacheGetAll = () => cache.entries();
const getArchiveKey = (key: string) => `${key}-archive`;

async function getOrFetchFiles(
  key: string,
  predicate = (entry: Entry): boolean => entry.fileName.startsWith(key)
): Promise<string[]> {
  const archiveKey = getArchiveKey(key);
  if (!cacheHas(archiveKey)) {
    await fetchZipAsBuffer(key).then(buffer => cacheSet(archiveKey, buffer));
  }
  const buffer = cacheGet(archiveKey);
  if (!buffer) throw new Error(`no entry for ${key}`);
  const zipfile = await unzipFromBuffer(buffer);
  const files = [];
  zipfile.readEntry();
  zipfile.on('entry', async (entry: Entry) => {
    if (!predicate(entry)) return zipfile.readEntry();
    if (cacheHas(entry.fileName)) return files.push(entry.fileName) && zipfile.readEntry();

    const chunks: Buffer[] = [];
    const stream: Readable = await new Promise((resolve, reject) =>
      zipfile.openReadStream(entry, (err?: Error, readStream?: Readable) =>
        err ? reject(err) : resolve(readStream)
      )
    );
    stream.on('data', chunk => chunks.push(Buffer.from(chunk)));
    stream.on('end', () => {
      cacheSet(entry.fileName, Buffer.concat(chunks));
      files.push(entry.fileName);
      zipfile.readEntry();
    });
  });
  return new Promise(resolve => zipfile.on('end', () => resolve(files)));
}

export async function getZipInfo(key: string): Promise<string[]> {
  return (
    getOrFetchFiles(key)
      // quick hack to show processing & some info. won't really use/do this
      .then(files => files.map(fileName => fileName.toUpperCase()))
  );
}
