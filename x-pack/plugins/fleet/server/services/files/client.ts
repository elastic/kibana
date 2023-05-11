/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/core/server';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import type { FileClient } from '@kbn/files-plugin/server';
import { createEsFileClient } from '@kbn/files-plugin/server';

import type { BaseFileMetadata, FileCompression } from '@kbn/shared-ux-file-types';

import { getFileDataIndexName, getFileMetadataIndexName } from '../../../common';

import { FleetFileNotFound, FleetFilesClientError } from '../../errors';

import type { FleetFile, FleetFileClientInterface } from './types';

/**
 * Public interface for interacting with Files stored in Fleet indexes. Service is consumed via
 * the Fleet `Plugin#start()` interface - {@link FleetStartContract}
 */
export class FleetFilesClient implements FleetFileClientInterface {
  private readonly esFileClient: FileClient;
  private readonly fileMetaIndex: string;
  private readonly fileDataIndex: string;

  constructor(
    private esClient: ElasticsearchClient,
    private logger: Logger,
    packageName: string,
    private type: 'from-host' | 'to-host',
    maxSizeBytes?: number
  ) {
    if (!packageName) {
      throw new FleetFilesClientError('packageName is required');
    }

    this.fileMetaIndex = getFileMetadataIndexName(packageName);
    this.fileDataIndex = getFileDataIndexName(packageName);

    this.esFileClient = createEsFileClient({
      metadataIndex: this.fileDataIndex,
      blobStorageIndex: this.fileDataIndex,
      elasticsearchClient: esClient,
      logger,
      indexIsAlias: true,
      maxSizeBytes,
    });
  }

  get(fileId: string): Promise<FleetFile> {
    if (this.type === 'to-host') {
      // FIXME:PT implement
    }

    return this.getFileCreatedByHost(fileId);
  }

  create(): Promise<FleetFile> {}

  update(): Promise<FleetFile> {}

  delete(): Promise<void> {}

  doesFileHaveChunks(fileId: string): Promise<boolean> {}

  getFileDownloadStream(): Promise<void> {}

  private async getFileCreatedByHost(fileId: string): Promise<FLeetFile> {
    try {
      const fileDocSearchResult = await this.esClient.search<HostUploadedFileMetadata>({
        index: this.fileMetaIndex,
        body: {
          size: 1,
          query: {
            term: {
              _id: fileId,
            },
          },
        },
      });

      const docSearchHit = fileDocSearchResult.hits.hits[0] ?? {};

      if (!docSearchHit._source) {
        throw new FleetFileNotFound(`File with id [${fileId}] not found`);
      }

      const fleetFile = mapFileDocToFleetFile(docSearchHit);
      let fileHasChunks: boolean = true;

      // if status is `READY`, then ensure that file has chunks - for the cases where the file
      // data might have been cleaned up due to ILM
      if (fleetFile.status === 'READY') {
        fileHasChunks = await this.doesFileHaveChunks(fleetFile.id);

        if (!fileHasChunks) {
          this.logger.warn(
            `File with id [${fileId}] has no data chunks in index [${this.fileMetaIndex}]. File status will be adjusted to DELETED`
          );

          fleetFile.status = 'DELETED';
        }
      }

      return fleetFile;
    } catch (error) {
      if (error instanceof FleetFilesClientError) {
        throw error;
      }

      throw new FleetFilesClientError(error.message, error);
    }
  }
}

const mapFileDocToFleetFile = (fileDoc: estypes.SearchHit<HostUploadedFileMetadata>): FleetFile => {
  if (!fileDoc._source) {
    throw new FleetFilesClientError('Missing file document `_source`');
  }

  const {
    action_id: actionId,
    agent_id: agentId,
    file: { name, Status: status, mime_type: mimeType = '', size = 0, hash = {} },
  } = fileDoc._source;

  const file: FleetFile = {
    id: fileDoc._id,
    agents: [agentId],
    sha256: hash?.sha256 ?? '',
    actionId,
    name,
    status,
    mimeType,
    size,
  };

  return file;
};

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
