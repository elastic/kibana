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

const REGISTRY = process.env.REGISTRY || 'http://localhost:8080';

const cache: Map<string, Buffer> = new Map();
const cacheGet = (key: string) => cache.get(key);
const cacheSet = (key: string, value: Buffer) => cache.set(key, value);
const cacheHas = (key: string) => cache.has(key);
const cacheGetAll = () => cache.entries();
const getArchiveKey = (key: string) => `${key}-archive`;

const unzipFromBuffer = (buffer: Buffer): Promise<ZipFile> =>
  new Promise((resolve, reject) =>
    yauzl.fromBuffer(buffer, { lazyEntries: true }, (err?: Error, zipfile?: ZipFile) =>
      err ? reject(err) : resolve(zipfile)
    )
  );

function getResponse(url: string): Promise<http.IncomingMessage> {
  const lib = url.startsWith('https') ? https : http;
  return new Promise((resolve, reject) =>
    lib
      .get(url, (response: http.IncomingMessage) => {
        if (response.statusCode && response.statusCode === 200) {
          return resolve(response);
        }
        return reject(new Boom(response.statusMessage, { statusCode: response.statusCode }));
      })
      .on('error', reject)
  );
}

export async function fetchList() {
  return fetchJson(`${REGISTRY}/list`);
}

export async function fetchInfo(key: string) {
  return fetchJson(`${REGISTRY}/package/${key}`);
}

async function fetchUrl(url: string): Promise<string> {
  const response = await getResponse(url);
  return new Promise((resolve, reject) => {
    const body: string[] = [];
    response.on('data', (chunk: string) => body.push(chunk));
    response.on('end', () => resolve(body.join('')));
    response.on('error', reject);
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
  const response = await getResponse(`${REGISTRY}/package/${key}/get`);
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    response
      .on('data', chunk => chunks.push(Buffer.from(chunk)))
      .on('end', () => resolve(Buffer.concat(chunks)))
      .on('error', reject);
  });
}

async function filesFromBuffer(
  buffer: Buffer,
  predicate = (entry: Entry): boolean => true
): Promise<string[]> {
  const zipfile = await unzipFromBuffer(buffer);
  const files: string[] = [];
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

async function getFiles(
  key: string,
  predicate = (entry: Entry): boolean => true
): Promise<string[]> {
  const archiveBuffer = await getOrFetchArchiveBuffer(key);
  const files = await filesFromBuffer(archiveBuffer, predicate);

  return files;
}

async function getOrFetchArchiveBuffer(key: string): Promise<Buffer> {
  const archiveKey = getArchiveKey(key);
  if (!cacheHas(archiveKey)) {
    await fetchZipAsBuffer(key).then(buffer => cacheSet(archiveKey, buffer));
  }

  const buffer = cacheGet(archiveKey);
  if (!buffer) throw new Error(`no archive buffer for ${key}`);

  return buffer;
}

export async function getZipInfo(key: string): Promise<string[]> {
  // quick hack to show processing & some info. won't really use/do this
  const stripRoot = (fileName: string) => fileName.replace(key, '');
  const isThisPackage = (entry: Entry) => entry.fileName.startsWith(key);

  return getFiles(key, isThisPackage).then(files => files.map(stripRoot));
}
