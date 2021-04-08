/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FullAgentPolicyHostAndProtocolConfig } from '../types';

export function getFullAgentPolicyHostAndProtocolConfig(
  urls: string[]
): FullAgentPolicyHostAndProtocolConfig {
  // paths and protocol are validated to be the same for all urls, so use the first to get them
  const firstUrlParsed = new URL(urls[0]);
  const config: FullAgentPolicyHostAndProtocolConfig = {
    // remove the : from http:
    protocol: firstUrlParsed.protocol.replace(':', ''),
    hosts: urls.map((url) => new URL(url).host),
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
