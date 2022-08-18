/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FileMetadata } from '../../common';

export function createDefaultFileAttributes(): Pick<
  FileMetadata,
  'created' | 'Updated' | 'Status'
> {
  const dateString = new Date().toISOString();
  return {
    created: dateString,
    Status: 'AWAITING_UPLOAD',
    Updated: dateString,
  };
}
