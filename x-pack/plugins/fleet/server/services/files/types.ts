/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Readable } from 'stream';

import type { BaseFileMetadata, FileCompression, FileStatus } from '@kbn/shared-ux-file-types';

/**
 * Interface for files that were created by a host and consumed in kibana
 */
export interface FleetFromHostFileClientInterface {
  /** Checks if a file has chunks */
  doesFileHaveData(fileId: string): Promise<boolean>;

  /** Returns a Stream for downloading the file */
  download(fileId: string): Promise<{ stream: Readable; fileName: string; mimeType?: string }>;

  /** Returns meta info about the file */
  get(fileId: string): Promise<FleetFile>;
}

/**
 * Interface for files created via kibana to be delivered to a hosts
 */
export interface FleetToHostFileClientInterface extends FleetFromHostFileClientInterface {
  /** Creates a new file */
  create(fileStream: HapiReadableStream, agentIds: string[]): Promise<FleetFile>;

  /** Deletes a file */
  delete(fileId: string): Promise<void>;

  /** Updates metadata for the file */
  update(fileId: string, updates: Partial<FleetFileUpdatableFields>): Promise<FleetFile>;
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
  created: string;
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

/**
 * File upload metadata information. Stored by endpoint/fleet-server when a file is uploaded to ES in connection with
 * a response action
 */
export interface HostUploadedFileMetadata {
  action_id: string;
  agent_id: string;
  src: string; // The agent name. `endpoint` for security solution files
  upload_id: string;
  upload_start: number;
  contents: Array<
    Partial<{
      accessed: string; // ISO date
      created: string; // ISO date
      directory: string;
      file_extension: string;
      file_name: string;
      gid: number;
      inode: number;
      mode: string;
      mountpoint: string;
      mtime: string;
      path: string;
      sha256: string;
      size: number;
      target_path: string;
      type: string;
      uid: number;
    }>
  >;
  file: Pick<
    Required<BaseFileMetadata>,
    'name' | 'size' | 'Status' | 'ChunkSize' | 'mime_type' | 'extension'
  > &
    Omit<BaseFileMetadata, 'name' | 'size' | 'Status' | 'ChunkSize' | 'mime_type' | 'extension'> & {
      compression: FileCompression;
      attributes: string[];
      type: string;
    };
  host: {
    hostname: string;
  };
  transithash: {
    sha256: string;
  };
}

/**
 * The File metadata that is stored along with files uploaded to kibana (via the Files plugin)
 * @private
 */
export interface FileCustomMeta {
  target_agents: string[];
  action_id: string;
}

export interface FilesClientFactory {
  /**
   * Client to interact with files that will be sent to a host.
   * @param packageName
   * @param maxSizeBytes
   */
  toHost: (
    /** The integration package name */
    packageName: string,
    /** Max file size allow to be created (in bytes) */
    maxSizeBytes?: number
  ) => FleetToHostFileClientInterface;

  /**
   * Client to interact with files that were sent from the host
   * @param packageName
   */
  fromHost: (
    /** The integration package name */
    packageName: string
  ) => FleetFromHostFileClientInterface;
}
