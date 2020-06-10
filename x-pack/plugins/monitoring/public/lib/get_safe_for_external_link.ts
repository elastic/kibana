/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export function getSafeForExternalLink(url: string) {
  return `${url.split('?')[0]}?${location.hash.split('?')[1]}`;
}
