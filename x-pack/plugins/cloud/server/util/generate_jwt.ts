/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import crypto from 'node:crypto';

const toBase64 = (object: Record<string, unknown>): string => {
  const str = JSON.stringify(object);
  return Buffer.from(str).toString('base64');
};

const replaceSpecialChars = (b64string: string): string => {
  // create a regex to match any of the characters =,+ or / and replace them with their // substitutes
  return b64string.replace(/[=+/]/g, (charToBeReplaced) => {
    switch (charToBeReplaced) {
      case '=':
        return '';
      case '+':
        return '-';
      case '/':
        return '_';
      default:
        return charToBeReplaced;
    }
  });
};

const generateJwtB64 = (object: Record<string, unknown>): string => {
  const b64 = toBase64(object);
  return replaceSpecialChars(b64);
};

const createSignature = (header: string, payload: string, secret: string): string => {
  const signature = crypto.createHmac('sha256', secret);
  signature.update([header, payload].join('.'));
  const signatureStr = signature.digest('base64');
  return replaceSpecialChars(signatureStr);
};

export const generateSignedJwt = (userId: string, secret: string): string => {
  const header = generateJwtB64({
    alg: 'HS256',
    typ: 'JWT',
  });

  const EXP_MS = 5 * 60 * 1000;
  const expirationTime = Date.now() + EXP_MS;
  const payload = generateJwtB64({
    sub: userId,
    exp: expirationTime,
  });

  const signature = createSignature(header, payload, secret);

  return [header, payload, signature].join('.');
};
