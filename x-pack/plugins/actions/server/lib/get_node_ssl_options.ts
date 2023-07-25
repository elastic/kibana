/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PeerCertificate } from 'tls';
import { Logger } from '@kbn/core/server';
import { SSLSettings } from '../types';

export function getNodeSSLOptions(
  logger: Logger,
  verificationMode?: string,
  sslOverrides?: SSLSettings
): {
  rejectUnauthorized?: boolean;
  checkServerIdentity?: ((host: string, cert: PeerCertificate) => Error | undefined) | undefined;
  cert?: Buffer;
  key?: Buffer;
  pfx?: Buffer;
  passphrase?: string;
  ca?: Buffer;
} {
  const agentOptions: {
    rejectUnauthorized?: boolean;
    checkServerIdentity?: ((host: string, cert: PeerCertificate) => Error | undefined) | undefined;
    cert?: Buffer;
    key?: Buffer;
    pfx?: Buffer;
    passphrase?: string;
    ca?: Buffer;
  } = {};
  if (!!verificationMode) {
    switch (verificationMode) {
      case 'none':
        agentOptions.rejectUnauthorized = false;
        break;
      case 'certificate':
        agentOptions.rejectUnauthorized = true;
        // by default, NodeJS is checking the server identify
        agentOptions.checkServerIdentity = () => undefined;
        break;
      case 'full':
        agentOptions.rejectUnauthorized = true;
        break;
      default: {
        logger.warn(`Unknown ssl verificationMode: ${verificationMode}`);
        agentOptions.rejectUnauthorized = true;
      }
    }
    // see: src/core/server/elasticsearch/legacy/elasticsearch_client_config.ts
    // This is where the global rejectUnauthorized is overridden by a custom host
  }
  if (sslOverrides) {
    Object.assign(agentOptions, {
      cert: sslOverrides.cert,
      key: sslOverrides.key,
      pfx: sslOverrides.pfx,
      passphrase: sslOverrides.passphrase,
      ca: sslOverrides.ca,
    });
  }
  return agentOptions;
}

export function getSSLSettingsFromConfig(
  verificationMode?: 'none' | 'certificate' | 'full',
  rejectUnauthorized?: boolean
): SSLSettings {
  if (verificationMode) {
    return { verificationMode };
  } else if (rejectUnauthorized !== undefined) {
    return { verificationMode: rejectUnauthorized ? 'full' : 'none' };
  }
  return {};
}
