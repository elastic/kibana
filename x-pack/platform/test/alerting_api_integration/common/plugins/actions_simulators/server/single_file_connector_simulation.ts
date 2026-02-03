/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'fs';
import expect from '@kbn/expect';
import http from 'http';
import https from 'https';
import { promisify } from 'util';
import { fromNullable, map, filter, getOrElse } from 'fp-ts/Option';
import { pipe } from 'fp-ts/pipeable';
import { constant } from 'fp-ts/function';
import { KBN_KEY_PATH, KBN_CERT_PATH } from '@kbn/dev-utils';

export async function initPlugin() {
  const httpsServerKey = await promisify(fs.readFile)(KBN_KEY_PATH, 'utf8');
  const httpsServerCert = await promisify(fs.readFile)(KBN_CERT_PATH, 'utf8');

  return {
    httpServer: http.createServer(createServerCallback()),
    httpsServer: https.createServer(
      {
        key: httpsServerKey,
        cert: httpsServerCert,
      },
      createServerCallback()
    ),
  };
}

function createServerCallback() {
  return (request: http.IncomingMessage, response: http.ServerResponse) => {
    const credentials = pipe(
      fromNullable(request.headers.authorization),
      map((authorization) => authorization.split(/\s+/)),
      filter((parts) => parts.length > 1),
      map((parts) => Buffer.from(parts[1], 'base64').toString()),
      filter((credentialsPart) => credentialsPart.indexOf(':') !== -1),
      map((credentialsPart) => {
        const [username, password] = credentialsPart.split(':');
        return { username, password };
      }),
      getOrElse(constant({ username: '', password: '' }))
    );

    if (request.method === 'GET') {
      let data = '';
      request.on('data', (chunk) => {
        data += chunk;
      });
      request.on('end', () => {
        response.statusCode = 200;
        response.setHeader('Content-Type', 'application/json');
        response.end(data);
        return;
      });
    }

    // returns what it receives
    if (request.method === 'POST') {
      let data = '';
      request.on('data', (chunk) => {
        data += chunk;
      });
      request.on('end', () => {
        response.statusCode = 200;
        if (data === 'validateAuthentication') {
          return validateAuthentication(credentials, response);
        } else if (data === 'validateHeaders') {
          response.setHeader('Content-Type', 'application/json');
          response.end(JSON.stringify(request.headers));
        } else {
          response.setHeader('Content-Type', 'application/json');
          response.end(data);
        }
        return;
      });
    }

    if (request.method === 'DELETE') {
      response.statusCode = 200;
      response.end('OK');
      return;
    }
  };
}

function validateAuthentication(credentials: any, res: any) {
  try {
    expect(credentials).to.eql({
      username: 'elastic',
      password: 'changeme',
    });
    res.end('validation OK');
  } catch (ex) {
    res.end('validation NOT OK');
  }
}
