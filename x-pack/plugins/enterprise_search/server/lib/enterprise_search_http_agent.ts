/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync } from 'fs';

import http from 'http';
import https from 'https';

import { ConfigType } from '../';

// Returns an HTTP agent to be used for requests to Enterprise Search APIs
export const entSearchHttpAgent = (config: ConfigType): http.Agent | https.Agent => {
  const defaultAgent = new http.Agent();

  if (!config.ssl) return defaultAgent;

  try {
    const { certificateAuthorities, rejectUnauthorized } = config.ssl;
    const parsedHost = new URL(config.host);
    if (parsedHost.protocol === 'https:') {
      return new https.Agent({
        ca: loadCertificateAuthorities(certificateAuthorities),
        rejectUnauthorized: !!rejectUnauthorized,
      });
    }
  } catch {
    // ignore the error and fall back to the default agent
  }

  return defaultAgent;
};

// Loads custom CA certificate files and returns all certificates as an array
export const loadCertificateAuthorities = (ca: string | string[]): string[] => {
  const parsedCerts = [];
  if (ca) {
    const paths = Array.isArray(ca) ? ca : [ca];
    if (paths.length > 0) {
      for (const path of paths) {
        const parsedCert = readFileSync(path, 'utf8');
        parsedCerts.push(parsedCert);
      }
    }
  }
  return parsedCerts;
};
