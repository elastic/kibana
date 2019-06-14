/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import yauzl from 'yauzl';
import fetch, { Response } from 'node-fetch';
import { Readable } from 'stream';
import tar from 'tar';

const REGISTRY = process.env.REGISTRY || 'http://localhost:8080';

const cache: Map<string, Buffer> = new Map();
const cacheGet = (key: string) => cache.get(key);
const cacheSet = (key: string, value: Buffer) => cache.set(key, value);
const cacheHas = (key: string) => cache.has(key);

export async function fetchList() {
  return fetchJson(`${REGISTRY}/list`);
}

export async function fetchInfo(key: string) {
  return fetchJson(`${REGISTRY}/package/${key}`);
}

export async function getArchiveInfo(key: string): Promise<string[]> {
  return getFiles(key);
}

function bufferToStream(buffer: Buffer): Readable {
  const stream = new Readable();
  stream.push(buffer);
  stream.push(null);
  return stream;
}

function streamToString(stream: NodeJS.ReadableStream): Promise<string> {
  return new Promise((resolve, reject) => {
    const body: string[] = [];
    stream.on('data', (chunk: string) => body.push(chunk));
    stream.on('end', () => resolve(body.join('')));
    stream.on('error', reject);
  });
}

function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on('data', chunk => chunks.push(Buffer.from(chunk)));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}

function getResponse(url: string): Promise<Response> {
  return new Promise((resolve, reject) =>
    fetch(url).then((response: Response) =>
      response.ok
        ? resolve(response)
        : reject(new Boom(response.statusText, { statusCode: response.status }))
    )
  );
}

async function getResponseStream(url: string): Promise<NodeJS.ReadableStream> {
  const res = await getResponse(url);
  return res.body;
}

async function fetchUrl(url: string): Promise<string> {
  return getResponseStream(url).then(streamToString);
}

async function fetchJson(url: string): Promise<object> {
  const json = await fetchUrl(url);
  const data = JSON.parse(json);
  return data;
}

async function getFiles(
  key: string,
  predicate = (entry: yauzl.Entry | tar.FileStat): boolean => true
): Promise<string[]> {
  const archiveBuffer = await getOrFetchArchiveBuffer(key);
  const extract = key.endsWith('.zip') ? unzipBuffer : untarBuffer;
  const files = await extract(archiveBuffer, predicate);

  return files;
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

async function unzipBuffer(
  buffer: Buffer,
  predicate = (entry: yauzl.Entry): boolean => true
): Promise<string[]> {
  const files: string[] = [];
  const zipfile = await yauzlFromBuffer(buffer, { lazyEntries: true });
  zipfile.readEntry();
  zipfile.on('entry', async (entry: yauzl.Entry) => {
    if (!predicate(entry)) return zipfile.readEntry();
    if (cacheHas(entry.fileName)) return files.push(entry.fileName) && zipfile.readEntry();

    const entryBuffer = await getZipReadStream(zipfile, entry).then(streamToBuffer);
    cacheSet(entry.fileName, entryBuffer);
    files.push(entry.fileName);
    zipfile.readEntry();
  });
  return new Promise(resolve => zipfile.on('end', () => resolve(files)));
}

async function untarBuffer(
  buffer: Buffer,
  predicate = (entry: tar.FileStat): boolean => true
): Promise<string[]> {
  const stream = bufferToStream(buffer);
  const paths: string[] = [];
  return new Promise((resolve, reject) => {
    // ts erroring with:
    // 'new' expression, whose target lacks a construct signature, implicitly has an 'any' type.
    const parser: NodeJS.ReadWriteStream = new tar.Parse();
    parser
      .on('entry', (entry: tar.FileStat) => {
        if (!predicate(entry)) return;
        streamToBuffer(entry).then(entryBuffer => {
          if (!entry.header.path) return;
          cacheSet(entry.header.path, entryBuffer);
          paths.push(entry.header.path);
        });
      })
      .on('end', () => resolve(paths))
      .on('error', reject);

    stream.pipe(parser);
  });
}

function yauzlFromBuffer(buffer: Buffer, opts: yauzl.Options): Promise<yauzl.ZipFile> {
  return new Promise((resolve, reject) =>
    yauzl.fromBuffer(buffer, opts, (err?, handle?) => (err ? reject(err) : resolve(handle)))
  );
}

function getZipReadStream(
  zipfile: yauzl.ZipFile,
  entry: yauzl.Entry
): Promise<NodeJS.ReadableStream> {
  return new Promise((resolve, reject) =>
    zipfile.openReadStream(entry, (err?: Error, readStream?: NodeJS.ReadableStream) =>
      err ? reject(err) : resolve(readStream)
    )
  );
}
