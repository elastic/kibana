/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash, createSign } from 'crypto';
import fs from 'fs';
import url from 'url';

export function getStateAndNonce(urlWithStateAndNonce: string) {
  const parsedQuery = url.parse(urlWithStateAndNonce, true).query;
  return { state: parsedQuery.state as string, nonce: parsedQuery.nonce as string };
}

function fromBase64(base64: string) {
  return base64.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

export function createTokens(userId: string, nonce: string) {
  const idTokenHeader = fromBase64(
    Buffer.from(JSON.stringify({ alg: 'RS256' })).toString('base64')
  );

  const iat = Math.floor(Date.now() / 1000);
  const accessToken = `valid-access-token${userId}`;
  const accessTokenHashBuffer = createHash('sha256').update(accessToken).digest();
  const idTokenBody = fromBase64(
    Buffer.from(
      JSON.stringify({
        iss: 'https://test-op.elastic.co',
        sub: `user${userId}`,
        aud: '0oa8sqpov3TxMWJOt356',
        nonce,
        exp: iat + 3600,
        iat,
        // See more details on `at_hash` at https://openid.net/specs/openid-connect-core-1_0.html#ImplicitIDToken
        at_hash: fromBase64(
          accessTokenHashBuffer.slice(0, accessTokenHashBuffer.length / 2).toString('base64')
        ),
      })
    ).toString('base64')
  );

  const idToken = `${idTokenHeader}.${idTokenBody}`;

  const signingKey = fs.readFileSync(require.resolve('./jwks_private.pem'));
  const idTokenSignature = fromBase64(
    createSign('RSA-SHA256').update(idToken).sign(signingKey, 'base64')
  );

  return { accessToken, idToken: `${idToken}.${idTokenSignature}` };
}
