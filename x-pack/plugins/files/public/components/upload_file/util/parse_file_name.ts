/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import mime from 'mime-types';

interface Result {
  name: string;
  mime?: string;
}

export function parseFileName(fileName: string): Result {
  const mimeType = mime.lookup(fileName);
  return {
    name: fileName
      .slice(0, 256)
      .trim()
      .replace(/\..*$/, '') // remove extension
      .replace(/[^a-z0-9\s]/gi, '_'), // replace invalid chars
    mime: mimeType || undefined,
  };
}
