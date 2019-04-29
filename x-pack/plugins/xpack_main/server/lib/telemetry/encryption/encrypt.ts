/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createRequestEncryptor } from '@elastic/request-crypto';
import { telemetryJWKS } from './telemetry_jwks';

export function getKID(config: any): string {
  const isDev = config.get('env.dev');
  return isDev ? 'kibana_dev' : 'kibana';
}

export async function encryptTelemetry(config: any, payload: any): Promise<string> {
  const kid = getKID(config);
  const encryptor = await createRequestEncryptor(telemetryJWKS);
  return encryptor.encrypt(kid, payload);
}
