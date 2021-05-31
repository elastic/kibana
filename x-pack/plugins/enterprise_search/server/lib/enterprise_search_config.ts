/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync } from 'fs';

import http from 'http';
import https from 'https';

import { ConfigType } from '../index';

/**
 * Wrapper of config schema.
 * @public
 */
export class EnterpriseSearchConfig {
  /**
   * Base URL (schema://host:port) of the Enterprise Search deployment
   */
  public host?: string;

  /**
   * Specifies if Enterprise Search plugin should be enabled
   */
  public enabled: boolean;

  /**
   * Specifies the timeout for all API calls to Enterprise Search
   */
  public accessCheckTimeout: number;

  /**
   * Specifies a warning threshold for all API calls to Enterprise Search.
   * If a request takes longer than this value, a user will be presented
   * with a warning message asking them to make sure everything is OK.
   */
  public accessCheckTimeoutWarning: number;

  /**
   * A list of custom certificate authorities to be used for connecting to
   * Enterprise Search APIs. If empty, default list of root CAs is used.
   */
  public certificateAuthorities: string[];

  /**
   * If set to true, SSL errors when connecting to Enterprise Search will be
   * ignored as long as a successful SSL handshake could be performed.
   */
  public rejectUnauthorized: boolean;

  /**
   * HTTP agent object to be used for all Enterprise Search API calls
   */
  public httpAgent: http.Agent | https.Agent;

  /**
   * @internal
   */
  constructor(rawConfig: ConfigType) {
    this.host = rawConfig.host;
    this.enabled = rawConfig.enabled;
    this.accessCheckTimeout = rawConfig.accessCheckTimeout;
    this.accessCheckTimeoutWarning = rawConfig.accessCheckTimeoutWarning;
    this.rejectUnauthorized = rawConfig.ssl.rejectUnauthorized;
    this.certificateAuthorities = this.loadCertificateAuthorities(
      rawConfig.ssl.certificateAuthorities
    );
    this.httpAgent = this.httpAgentFor(this.host);
  }

  /**
   * Loads custom CA certificate files and returns all certificates as an array
   **/
  private loadCertificateAuthorities(ca: string | string[] | undefined) {
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
  }

  /**
   * Returns an HTTP agent object to be used for connecting to a given host
   */
  private httpAgentFor(host: string | undefined) {
    if (host) {
      try {
        const parsedHost = new URL(host);
        if (parsedHost.protocol === 'https:') {
          return new https.Agent({
            ca: this.certificateAuthorities,
            rejectUnauthorized: this.rejectUnauthorized,
          });
        }
      } catch {
        // ignore the error
      }
    }

    // Use HTTP agent by default
    return new http.Agent();
  }
}
