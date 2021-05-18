/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PeerCertificate } from 'tls';

export function getNodeTLSOptions(
  verificationMode?: string,
  legacyRejectUnauthorized?: boolean
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
      default:
        throw new Error(`Unknown ssl verificationMode: ${verificationMode}`);
    }
    // see: src/core/server/elasticsearch/legacy/elasticsearch_client_config.ts
    // This is where the global rejectUnauthorized is overridden by a custom host
  } else if (legacyRejectUnauthorized !== undefined) {
    agentOptions.rejectUnauthorized = legacyRejectUnauthorized;
  }
  return agentOptions;
}
