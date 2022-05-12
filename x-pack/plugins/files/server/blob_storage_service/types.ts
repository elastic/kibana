/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Readable } from 'stream';

/**
 * TODO: Finish this interface and document all methods
 *
 * @internal
 */
export interface BlobStorage {
  upload(content: Readable): Promise<{ id: string }>;

  download(id: string): Promise<Readable>;

  delete(id: string): Promise<void>;
}
