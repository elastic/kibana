/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export function getFullCloudUrl(baseUrl, dirPath) {
  let fullCloudUrl = '';

  if (baseUrl && dirPath) {
    fullCloudUrl = baseUrl.concat(dirPath);
  } else {
    throw new Error(`Both a baseUrl and dirPath must be passed to the getFullCloudUrl function.`);
  }
  return fullCloudUrl;
}
