/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

interface Location {
  hash: string;
}

export function getSafeForExternalLink(url: string, location: Location = window.location) {
  const hashParts = location.hash.split('?').filter(Boolean);
  if (hashParts.length === 0) {
    return url;
  }
  const urlParts = url.split('?').filter(Boolean);
  return `${urlParts[0]}?${
    urlParts.length === 2 ? urlParts[1] : hashParts.length === 2 ? hashParts[1] : ''
  }`;
}
