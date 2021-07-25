/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const extractDomainAndEntryPointFromUrl = (
  url: string
): { domain: string; entryPoint: string } => {
  let domain = url;
  let entryPoint = '/';

  const pathSlashIndex = url.search(/[^\:\/]\//);
  if (pathSlashIndex !== -1) {
    domain = url.substring(0, pathSlashIndex + 1);
    entryPoint = url.substring(pathSlashIndex + 1);
  }

  return { domain, entryPoint };
};
