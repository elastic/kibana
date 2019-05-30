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
// other places use 'extract-zip' or 'yauzl'
import { decompress } from '@kbn/es/src/utils';

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
      .on('response', resolve)
      .on('error', reject);
  });
}

function writeResponseToDisk(response: http.IncomingMessage, filepath: string): Promise<void> {
  return new Promise((resolve, reject) =>
    response.pipe(fs.createWriteStream(filepath).on('finish', resolve)).on('error', reject)
  );
}

export async function getZipInfo(key: string): Promise<void | string[]> {
  const TMP_DIR = os.tmpdir();
  const zipLocation = path.join(TMP_DIR, `${key}.zip`);
  const extractedTo = zipLocation.replace('.zip', '');
  const pattern = path.join(extractedTo, '**');

  return (
    fetchZip(key)
      .then(response => writeResponseToDisk(response, zipLocation))
      .then(() => decompress(zipLocation, TMP_DIR))
      .then(() => globP(pattern))
      // quick hack to show processing & some info. won't really use/do this
      .then(files => files.map(filepath => filepath.replace(extractedTo, '')).filter(Boolean))
  );
}
