/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import GitUrlParse from 'git-url-parse';

export function isValidGitUrl(
  url: string,
  hostWhitelist?: string[],
  protocolWhitelist?: string[]
): boolean {
  try {
    const repo = GitUrlParse(url);

    let isHostValid = true;
    if (hostWhitelist && hostWhitelist.length > 0) {
      const hostSet = new Set(hostWhitelist);
      isHostValid = hostSet.has(repo.source);
    }

    let isProtocolValid = true;
    if (protocolWhitelist && protocolWhitelist.length > 0) {
      const protocolSet = new Set(protocolWhitelist);
      isProtocolValid = protocolSet.has(repo.protocol);
    }

    return isHostValid && isProtocolValid;
  } catch (error) {
    return false;
  }
}
