/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export function serializeUrlParams(urlParams: {
  [key in string]: string[] | string | undefined;
}) {
  const urlSearchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(urlParams)) {
    if (value) {
      if (Array.isArray(value)) {
        if (value.length === 0) {
          urlSearchParams.append(key, '');
        } else {
          value.forEach((v) => urlSearchParams.append(key, v));
        }
      } else {
        urlSearchParams.append(key, value);
      }
    }
  }

  return urlSearchParams;
}
