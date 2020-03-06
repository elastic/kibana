/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { fromByteArray } from 'base64-js';

export const imageTypes = ['image/svg+xml', 'image/jpeg', 'image/png', 'image/gif'];

export function encode(data: any | null, type = 'text/plain') {
  // use FileReader if it's available, like in the browser
  if (FileReader) {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = err => reject(err);
      reader.readAsDataURL(data);
    });
  }

  // otherwise fall back to fromByteArray
  // note: Buffer doesn't seem to correctly base64 encode binary data
  return Promise.resolve(`data:${type};base64,${fromByteArray(data)}`);
}
