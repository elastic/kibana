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

export type HttpAgent = http.Agent | https.Agent;

// Returns an HTTP agent to be used for requests to Enterprise Search APIs
export const entSearchHttpAgent = (config: ConfigType): HttpAgent => {
  const defaultAgent = new http.Agent();

  if (!config.host) return defaultAgent;

  try {
    const parsedHost = new URL(config.host);
    if (parsedHost.protocol === 'https:') {
      return new https.Agent({
        ca: loadCertificateAuthorities(config.ssl.certificateAuthorities),
        rejectUnauthorized: !!config.ssl.rejectUnauthorized,
      });
    }
  } catch {
    // Ignore URL parsing errors and fall back to the HTTP agent
  }

  return defaultAgent;
};

// Loads custom CA certificate files and returns all certificates as an array
export const loadCertificateAuthorities = (ca: string | string[] | undefined): string[] => {
  const parsedCerts: string[] = [];
  if (ca) {
    const paths = Array.isArray(ca) ? ca : [ca];
    paths.forEach((path) => {
      const parsedCert = readFileSync(path, 'utf8');
      parsedCerts.push(parsedCert);
    });
  }
  return parsedCerts;
};
