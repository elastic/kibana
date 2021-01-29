/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const encodePathParams = (pathParams: Record<string, string | number>) => {
  const encodedParams: Record<string, string> = {};

  Object.entries(pathParams).map(([key, value]) => {
    encodedParams[key] = encodeURIComponent(value);
  });

  return encodedParams;
};
