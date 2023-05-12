/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Readable } from 'stream';

import assert from 'assert';

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/core/server';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import type { FileClient } from '@kbn/files-plugin/server';
import { createFileHashTransform } from '@kbn/files-plugin/server';
import { createEsFileClient } from '@kbn/files-plugin/server';

import type { BaseFileMetadata, FileCompression } from '@kbn/shared-ux-file-types';

import { v4 as uuidV4 } from 'uuid';

import { getFileDataIndexName, getFileMetadataIndexName } from '../../../common';

import { FleetFileNotFound, FleetFilesClientError } from '../../errors';

import type {
  FleetFile,
  FleetFileClientInterface,
  FleetFileType,
  HapiReadableStream,
  FleetFileUpdatableFields,
} from './types';

interface FileCustomMeta {
  target_agents: string[];
  action_id: string;
}

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
    private type: FleetFileType,
    maxSizeBytes?: number
  ) {
    if (!packageName) {
      throw new FleetFilesClientError('packageName is required');
    }

    if (type === 'from-host') {
      this.fileMetaIndex = getFileMetadataIndexName(packageName);
      this.fileDataIndex = getFileDataIndexName(packageName);
    } else {
      // FIXME:PT define once we have new index patterns (defend workflows team issue #6553)
      this.fileMetaIndex = getFileMetadataIndexName(packageName);
      this.fileDataIndex = getFileDataIndexName(packageName);
    }

    this.esFileClient = createEsFileClient({
      metadataIndex: this.fileMetaIndex,
      blobStorageIndex: this.fileDataIndex,
      elasticsearchClient: esClient,
      logger,
      indexIsAlias: true,
      maxSizeBytes,
    });
  }

  async get(fileId: string): Promise<FleetFile> {
    if (this.type === 'to-host') {
      return this.getFileCreatedByKibana(fileId);
    }

    return this.getFileCreatedByHost(fileId);
  }

  async create(fileStream: HapiReadableStream, agentIds: string[]): Promise<FleetFile> {
    this.ensureTypeIsToHost();

    assert(agentIds.length > 0, new FleetFilesClientError('Missing agentIds!'));

    const uploadedFile = await this.esFileClient.create<FileCustomMeta>({
      id: uuidV4(),
      metadata: {
        name: fileStream.hapi.filename ?? 'unknown_file_name',
        mime: fileStream.hapi.headers['content-type'] ?? 'application/octet-stream',
        meta: {
          target_agents: agentIds,
          action_id: '',
        },
      },
    });

    await uploadedFile.uploadContent(fileStream, undefined, {
      transforms: [createFileHashTransform()],
    });

    assert(
      uploadedFile.data.hash && uploadedFile.data.hash.sha256,
      new FleetFilesClientError('File hash was not generated!')
    );

    return this.get(uploadedFile.id);
  }

  async update(
    fileId: string,
    updates: Partial<FleetFileUpdatableFields> = {}
  ): Promise<FleetFile> {
    this.ensureTypeIsToHost();

    const file = await this.esFileClient.get<FileCustomMeta>({
      id: fileId,
    });

    const { agents, actionId } = updates;
    const meta: FileCustomMeta = {
      target_agents: agents ?? file.data.meta?.target_agents ?? [],
      action_id: actionId ?? file.data.meta?.action_id ?? '',
    };

    await file.update({ meta });

    return this.get(fileId);
  }

  async delete(fileId: string): Promise<void> {
    this.ensureTypeIsToHost();

    await this.esFileClient.delete({ id: fileId, hasContent: true });
  }

  async doesFileHaveData(fileId: string): Promise<boolean> {
    try {
      const chunks = await this.esClient.search({
        index: this.fileDataIndex,
        size: 0,
        body: {
          query: {
            bool: {
              filter: [
                {
                  term: {
                    bid: fileId,
                  },
                },
              ],
            },
          },
          // Setting `_source` to false - we don't need the actual document to be returned
          _source: false,
        },
      });

      return Boolean((chunks.hits?.total as estypes.SearchTotalHits)?.value);
    } catch (err) {
      throw new FleetFilesClientError(
        `Checking if file id [${fileId}] has data in index [${this.fileDataIndex}] failed with: ${err.message}`,
        err
      );
    }
  }

  async download(
    fileId: string
  ): Promise<{ stream: Readable; fileName: string; mimeType?: string }> {
    try {
      const file = await this.esFileClient.get({ id: fileId });
      const { name: fileName, mimeType } = file.data;

      return {
        stream: await file.downloadContent(),
        fileName,
        mimeType,
      };
    } catch (error) {
      throw new FleetFilesClientError(
        `Attempt to get download stream failed with: ${error.message}`,
        error
      );
    }
  }

  protected async getFileCreatedByKibana(fileId: string): Promise<FleetFile> {
    // FIXME:PT update once we have new index and understand what the fields are (defend workflows team issue #6553)
    return this.getFileCreatedByHost(fileId);
  }

  protected async getFileCreatedByHost(fileId: string): Promise<FleetFile> {
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

      const fleetFile = this.mapIndexedDocToFleetFile(docSearchHit);
      let fileHasChunks: boolean = true;

      // if status is `READY`, then ensure that file has chunks - for the cases where the file
      // data might have been cleaned up due to ILM
      if (fleetFile.status === 'READY') {
        fileHasChunks = await this.doesFileHaveData(fleetFile.id);

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

  protected mapIndexedDocToFleetFile(
    fileDoc: estypes.SearchHit<HostUploadedFileMetadata>
  ): FleetFile {
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
  }

  protected ensureTypeIsToHost() {
    if (this.type !== 'to-host') {
      throw new FleetFilesClientError('Method is only supported when `type` is `to-host`');
    }
  }
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
