/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Readable } from 'stream';

/**
 * An interface that must be implemented by any blob storage adapter.
 *
 * @note
 * The blob storage target must be fully managed by Kibana through this interface
 * to avoid corrupting stored data.
 *
 * @note
 * File IDs are stored in Kibana Saved Objects as references to a file.
 *
 * @internal
 */
export interface BlobStorage {
  /**
   * Upload a new file.
   *
   * Generates a random file ID and returns it upon successfully uploading a
   * file.
   */
  upload(content: Readable): Promise<{ id: string; size: number }>;

  /**
   * Download a file.
   *
   * Given an ID, and optional file size, retrieve the file contents as a readable
   * stream.
   */
  download(args: { id: string; size?: number }): Promise<Readable>;

  /**
   * Delete a file given a unique ID.
   */
  delete(id: string): Promise<void>;
}
