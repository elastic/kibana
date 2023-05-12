/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Readable } from 'stream';

import type { FileStatus } from '@kbn/shared-ux-file-types';

/**
 * The type of file.
 * Use `from-host` when interacting with files that were sent to ES from the
 * host (via Fleet-Server)
 * Use `to-host` when interacting with files that are being sent to the host
 * (via fleet-server)
 */
export type FleetFileType = 'from-host' | 'to-host';

export interface FleetFileClientInterface {
  /** Creates a new file. Only applicable when type of file is `to-host`. */
  create(fileStream: HapiReadableStream, agentIds: string[]): Promise<FleetFile>;

  /** Deletes a file. Only applicable when type of file is `to-host`. */
  delete(fileId: string): Promise<void>;

  /** Updates metadata for the file. Only applicable when type of file is `to-host`. */
  update(fileId: string, updates: Partial<FleetFileUpdatableFields>): Promise<FleetFile>;

  /** Checks if a file has chunks */
  doesFileHaveData(fileId: string): Promise<boolean>;

  /** Returns a Stream for downloading the file */
  download(fileId: string): Promise<{ stream: Readable; fileName: string; mimeType?: string }>;

  /** Returns meta info about the file */
  get(fileId: string): Promise<FleetFile>;
}

export interface FleetFile {
  id: string;
  actionId: string;
  agents: string[];
  name: string;
  status: FileStatus;
  mimeType: string;
  size: number;
  sha256: string;
}

/**
 * Readable returned by Hapi when `stream` is used to define a property and/or route payload
 */
export interface HapiReadableStream extends Readable {
  hapi: {
    filename: string;
    headers: Record<string, string>;
  };
}

export interface FleetFileUpdatableFields {
  agents: string[];
  actionId: string;
}
