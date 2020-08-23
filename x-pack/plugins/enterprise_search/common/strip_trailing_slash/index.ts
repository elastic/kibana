/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 * Small helper for stripping trailing slashes from URLs or paths
 * (usually ones that come in from React Router or API endpoints)
 */
export const stripTrailingSlash = (url: string): string => {
  return url && url.endsWith('/') ? url.slice(0, -1) : url;
};
