/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import GitUrlParse from 'git-url-parse';

// return true if the git url is valid, otherwise throw Error with
// exact reasons.
export function validateGitUrl(
  url: string,
  hostWhitelist?: string[],
  protocolWhitelist?: string[]
): boolean {
  const repo = GitUrlParse(url);

  if (hostWhitelist && hostWhitelist.length > 0) {
    const hostSet = new Set(hostWhitelist);
    if (!hostSet.has(repo.source)) {
      throw new Error('Git url host is not whitelisted.');
    }
  }

  if (protocolWhitelist && protocolWhitelist.length > 0) {
    const protocolSet = new Set(protocolWhitelist);
    if (!protocolSet.has(repo.protocol)) {
      throw new Error('Git url protocol is not whitelisted.');
    }
  }
  return true;
}
