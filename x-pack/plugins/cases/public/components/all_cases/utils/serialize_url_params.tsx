/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export function serializeUrlParams(urlParams: {
  [key in string]: string[] | string;
}) {
  const urlSearchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(urlParams)) {
    if (Array.isArray(value)) {
      urlSearchParams.append(key, value.join(','));
    } else {
      urlSearchParams.append(key, value);
    }
  }

  return urlSearchParams;
}
