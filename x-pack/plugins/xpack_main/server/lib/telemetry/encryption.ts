/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as path from 'path';
import { readFile } from 'fs';
import { createRequestEncryptor, PublicJWK } from 'request-crypto';
import { promisify } from 'util';

const DEVELOPMENT_JWK_NAME = 'kibana_dev';
const readFileAsync = promisify(readFile);

export function getKID(kbnServer: any): string {
  const config = kbnServer.config();
  const isDev = config.get('env.dev');
  if (isDev) {
    return DEVELOPMENT_JWK_NAME;
  }
  return kbnServer.version.replace(/-snapshot/i, '');
}

export async function getEncrypotionJWK(kid: string): Promise<PublicJWK> {
  const jwkPath = path.join(__dirname, './', kid, '.json');
  console.log('jwkPath::', jwkPath);
  return readFileAsync(jwkPath, 'utf8');
}

export async function encryptTelemetry(kbnServer: any, payload: any): Promise<string> {
  const kid = getKID(kbnServer);
  const jwk = await getEncrypotionJWK(kid);
  const encryptor = await createRequestEncryptor(jwk);
  return encryptor.encrypt(kid, payload);
}
