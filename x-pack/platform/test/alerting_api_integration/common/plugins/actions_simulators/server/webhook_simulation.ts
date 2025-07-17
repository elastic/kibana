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
import { fromNullable, map, filter, getOrElse } from 'fp-ts/lib/Option';
import { pipe } from 'fp-ts/lib/pipeable';
import { constant } from 'fp-ts/lib/function';
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
  const payloads: string[] = [];
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

    // return the payloads that were posted to be remembered
    if (request.method === 'GET') {
      response.statusCode = 200;
      response.setHeader('Content-Type', 'application/json');
      response.end(JSON.stringify(payloads, null, 4));
      return;
    }

    if (request.method === 'POST' || request.method === 'PUT') {
      let data = '';
      request.on('data', (chunk) => {
        data += chunk;
      });
      request.on('end', () => {
        switch (data) {
          case 'success':
            response.statusCode = 200;
            response.end('OK');
            return;
          case 'authenticate':
            return validateAuthentication(credentials, response);
          case 'success_post_method':
            return validateRequestUsesMethod(request.method ?? '', 'post', response);
          case 'success_put_method':
            return validateRequestUsesMethod(request.method ?? '', 'put', response);
          case 'failure':
            response.statusCode = 500;
            response.end('Error');
            return;
        }

        // store a payload that was posted to be remembered
        const match = data.match(/^payload ([\S\s]*)$/);
        if (match) {
          payloads.push(match[1]);
          response.statusCode = 200;
          response.end('ok');
          return;
        }

        response.statusCode = 400;
        response.end(`unexpected body ${data}`);
        // eslint-disable-next-line no-console
        console.log(`webhook simulator received unexpected body: ${data}`);
        return;
      });
    } else {
      request.on('end', () => {
        response.statusCode = 400;
        response.end('unknown request to webhook simulator [no content]');
        return;
      });
    }
  };
}

function validateAuthentication(credentials: any, res: any) {
  try {
    expect(credentials).to.eql({
      username: 'elastic',
      password: 'changeme',
    });
    res.statusCode = 200;
    res.end('OK');
  } catch (ex) {
    res.statusCode = 403;
    res.end(`the validateAuthentication operation failed. ${ex.message}`);
  }
}

function validateRequestUsesMethod(requestMethod: string, method: string, res: any) {
  try {
    expect(requestMethod.toLowerCase()).to.eql(method);
    res.statusCode = 200;
    res.end('OK');
  } catch (ex) {
    res.statusCode = 403;
    res.end(`the validateAuthentication operation failed. ${ex.message}`);
  }
}
