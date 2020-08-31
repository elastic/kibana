/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Readable } from 'stream';

// TODO: Remove in favor of Readable.from once we upgrade to Node 12.x
export const createReadableStreamFromArray = (array: unknown[]) => {
  return new Readable({
    objectMode: true,
    read() {
      array.forEach((entry) => this.push(entry));
      this.push(null);
    },
  });
};
