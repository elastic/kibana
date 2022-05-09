/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReadStream } from 'fs';

/**
 * TODO: Finish this interface and document all methods
 *
 * @internal
 */
export interface BlobStorage {
  /**
   * Set up the blob store. E.g., establish connections.
   */
  setup(): Promise<void>;

  upload(fileName: string, content: ReadStream): Promise<{ uri: string }>;

  delete(uri: string): Promise<void>;
}
