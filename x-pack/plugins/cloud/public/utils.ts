/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export function getFullCloudUrl(baseUrl: string | undefined, dirPath: string | undefined) {
  let fullCloudUrl = '';

  if (typeof baseUrl !== 'undefined' && typeof dirPath !== 'undefined') {
    fullCloudUrl = baseUrl.concat(dirPath);
  }

  return fullCloudUrl;
}
