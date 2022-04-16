/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PeerCertificate } from 'tls';
import { Logger } from '@kbn/core/server';
import { SSLSettings } from '../../types';

export function getNodeSSLOptions(
  logger: Logger,
  verificationMode?: string
): {
  rejectUnauthorized?: boolean;
  checkServerIdentity?: ((host: string, cert: PeerCertificate) => Error | undefined) | undefined;
} {
  const agentOptions: {
    rejectUnauthorized?: boolean;
    checkServerIdentity?: ((host: string, cert: PeerCertificate) => Error | undefined) | undefined;
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
