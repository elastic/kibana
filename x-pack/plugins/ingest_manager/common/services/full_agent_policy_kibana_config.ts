/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FullAgentPolicyKibanaConfig } from '../types';

export function getFullAgentPolicyKibanaConfig(kibanaUrls: string[]): FullAgentPolicyKibanaConfig {
  // paths and protocol are validated to be the same for all urls, so use the first to get them
  const firstUrlParsed = new URL(kibanaUrls[0]);
  const config: FullAgentPolicyKibanaConfig = {
    // remove the : from http:
    protocol: firstUrlParsed.protocol.replace(':', ''),
    hosts: kibanaUrls.map((url) => new URL(url).host),
  };

  // add path if user provided one
  if (firstUrlParsed.pathname !== '/') {
    // make sure the path ends with /
    config.path = firstUrlParsed.pathname.endsWith('/')
      ? firstUrlParsed.pathname
      : `${firstUrlParsed.pathname}/`;
  }
  return config;
}
