/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync } from 'fs';
import http from 'http';
import https from 'https';
import { PeerCertificate } from 'tls';

import { ConfigType } from '../';

export type HttpAgent = http.Agent | https.Agent;
interface AgentOptions {
  rejectUnauthorized?: boolean;
  checkServerIdentity?: ((host: string, cert: PeerCertificate) => Error | undefined) | undefined;
}

/*
 * Returns an HTTP agent to be used for requests to Enterprise Search APIs
 */
class EnterpriseSearchHttpAgent {
  public httpAgent: HttpAgent = new http.Agent();

  getHttpAgent() {
    return this.httpAgent;
  }

  initializeHttpAgent(config: ConfigType) {
    if (!config.host) return;

    try {
      const parsedHost = new URL(config.host);
      if (parsedHost.protocol === 'https:') {
        this.httpAgent = new https.Agent({
          ca: this.loadCertificateAuthorities(config.ssl.certificateAuthorities),
          ...this.getAgentOptions(config.ssl.verificationMode),
        });
      }
    } catch {
      // Ignore URL parsing errors and fall back to the HTTP agent
    }
  }

  /*
   * Loads custom CA certificate files and returns all certificates as an array
   * This is a potentially expensive operation & why this helper is a class
   * initialized once on plugin init
   */
  loadCertificateAuthorities(certificates: string | string[] | undefined): string[] {
    if (!certificates) return [];

    const paths = Array.isArray(certificates) ? certificates : [certificates];
    return paths.map((path) => readFileSync(path, 'utf8'));
  }

  /*
   * Convert verificationMode to rejectUnauthorized for more consistent config settings
   * with the rest of Kibana
   * @see https://github.com/elastic/kibana/blob/main/x-pack/plugins/actions/server/builtin_action_types/lib/get_node_tls_options.ts
   */
  getAgentOptions(verificationMode: 'full' | 'certificate' | 'none') {
    const agentOptions: AgentOptions = {};

    switch (verificationMode) {
      case 'none':
        agentOptions.rejectUnauthorized = false;
        break;
      case 'certificate':
        agentOptions.rejectUnauthorized = true;
        agentOptions.checkServerIdentity = () => undefined;
        break;
      case 'full':
      default:
        agentOptions.rejectUnauthorized = true;
        break;
    }

    return agentOptions;
  }
}

export const entSearchHttpAgent = new EnterpriseSearchHttpAgent();
