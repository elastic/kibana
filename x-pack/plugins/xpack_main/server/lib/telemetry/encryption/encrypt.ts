/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createRequestEncryptor } from '@elastic/request-crypto';
import { telemetryJWKS } from './telemetry_jwks';

export function getKID(kbnServer: any): string {
  const config = kbnServer.config();
  const isDev = config.get('env.dev');
  if (!isDev) {
    return 'kibana_prod';
  }
  return 'kibana_dev';
}

export async function encryptTelemetry(kbnServer: any, payload: any): Promise<string> {
  const kid = getKID(kbnServer);
  const encryptor = await createRequestEncryptor(telemetryJWKS);
  return encryptor.encrypt(kid, payload);
}
