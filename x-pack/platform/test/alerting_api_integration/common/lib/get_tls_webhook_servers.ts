/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'fs';
import https from 'https';
import getPort from 'get-port';
import { KBN_KEY_PATH, KBN_CERT_PATH } from '@kbn/dev-utils';

interface TlsWebhookURLs {
  noCustom: string;
  rejectUnauthorizedFalse: string;
  rejectUnauthorizedTrue: string;
  caFile: string;
}

const ServerCert = fs.readFileSync(KBN_CERT_PATH, 'utf8');
const ServerKey = fs.readFileSync(KBN_KEY_PATH, 'utf8');

export async function getTlsWebhookServerUrls(
  portRangeStart: number,
  portRangeEnd: number
): Promise<TlsWebhookURLs> {
  let port: number;

  port = await getPort({ port: getPort.makeRange(portRangeStart, portRangeEnd) });
  const noCustom = `https://localhost:${port}`;

  port = await getPort({ port: getPort.makeRange(portRangeStart, portRangeEnd) });
  const rejectUnauthorizedFalse = `https://localhost:${port}`;

  port = await getPort({ port: getPort.makeRange(portRangeStart, portRangeEnd) });
  const rejectUnauthorizedTrue = `https://localhost:${port}`;

  port = await getPort({ port: getPort.makeRange(portRangeStart, portRangeEnd) });
  const caFile = `https://localhost:${port}`;

  return {
    noCustom,
    rejectUnauthorizedFalse,
    rejectUnauthorizedTrue,
    caFile,
  };
}

export async function createTlsWebhookServer(port: string): Promise<https.Server> {
  const httpsOptions = {
    cert: ServerCert,
    key: ServerKey,
  };

  const server = https.createServer(httpsOptions, async (req, res) => {
    if (req.method === 'POST' || req.method === 'PUT') {
      const allRead = new Promise((resolve) => {
        req.on('data', (chunk) => {});
        req.on('end', () => resolve(null));
      });
      await allRead;
    }

    res.writeHead(200);
    res.end('https: just testing that a connection could be made');
  });
  const listening = new Promise((resolve) => {
    server.listen(port, () => {
      resolve(null);
    });
  });
  await listening;

  // let node exit even if we don't close this server
  server.unref();

  return server;
}
