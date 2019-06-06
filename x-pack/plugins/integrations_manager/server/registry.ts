/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import fs from 'fs';
import os from 'os';
import path from 'path';
import http from 'http';
import https from 'https';
import { promisify } from 'util';
import glob from 'glob';
import Boom from 'boom';
import { decompress } from './decompress';

const REGISTRY = process.env.REGISTRY || 'http://localhost:8080';
const globP = promisify(glob);

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

function fetchZip(key: string): Promise<http.IncomingMessage> {
  return new Promise((resolve, reject) => {
    const url = `${REGISTRY}/package/${key}/get`;
    const lib = url.startsWith('https') ? https : http;

    lib
      .get(url)
      .on('response', (response: http.IncomingMessage) =>
        response.statusCode && response.statusCode === 200
          ? resolve(response)
          : reject(new Boom(response.statusMessage, { statusCode: response.statusCode }))
      )
      .on('error', reject);
  });
}

function writeResponseToDisk(response: http.IncomingMessage, filepath: string): Promise<void> {
  return new Promise((resolve, reject) =>
    response.pipe(fs.createWriteStream(filepath).on('finish', resolve)).on('error', reject)
  );
}

const zipLocation = (key: string): string => path.join(os.tmpdir(), `${key}.zip`);
const extractedZipTo = (key: string): string => zipLocation(key).replace('.zip', '');

async function fetchFiles(key: string): Promise<void> {
  const response = await fetchZip(key);
  await writeResponseToDisk(response, zipLocation(key));
  return decompress(zipLocation(key), os.tmpdir());
}

async function getOrFetchFiles(key: string): Promise<string[]> {
  const pattern = path.join(extractedZipTo(key), '**');
  const files = await globP(pattern);
  return files.length ? files : fetchFiles(key).then(() => globP(pattern));
}

export async function getZipInfo(key: string): Promise<string[]> {
  return (
    getOrFetchFiles(key)
      // quick hack to show processing & some info. won't really use/do this
      .then(files =>
        files.map(filepath => filepath.replace(extractedZipTo(key), '')).filter(Boolean)
      )
  );
}
