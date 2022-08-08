/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { FileKind } from '../../common/types';
import type { FileMetadataClient } from './file_metadata_client';
import type { BlobStorageClient } from '../blob_storage_service';
import { enforceMaxByteSizeTransform } from './stream_transforms';

/**
 * Wraps the {@link FileMetadataClient} and {@link BlobStorageClient} client
 * to provide basic file CRUD functionality.
 */
export class FileClient {
  constructor(
    private fileKindDescriptor: FileKind,
    private readonly metadataClient: FileMetadataClient,
    private readonly blobStorageClient: BlobStorageClient
  ) {}

  /** See {@link FileMetadata.FileKind}.  */
  public get fileKind(): string {
    return this.fileKindDescriptor.id;
  }

  /** See {@link FileMetadataClient.create}. */
  public create: FileMetadataClient['create'] = async (arg) => {
    return this.metadataClient.create(arg);
  };

  /**
   * See {@link FileMetadataClient.get}
   *
   * @param arg - Argument to get a file
   */
  public get: FileMetadataClient['get'] = async (arg) => {
    return this.metadataClient.get(arg);
  };

  /**
   * {@link FileMetadataClient.update}
   *
   * @param arg - Argument to get a file
   */
  public update: FileMetadataClient['update'] = (arg) => {
    return this.metadataClient.update(arg);
  };

  /**
   * Delete a file.
   * @param param0 - Argument to delete a file
   */
  public async delete({ id, hasContent = true }: { id: string; hasContent?: boolean }) {
    if (hasContent) await this.blobStorageClient.delete(id);
    return this.metadataClient.delete({ id });
  }

  /**
   * See {@link BlobStorageClient.delete}
   *
   * @param arg - Argument to delete a file
   */
  public deleteContent: BlobStorageClient['delete'] = (arg) => {
    return this.blobStorageClient.delete(arg);
  };

  /**
   * See {@link FileMetadataClient.list}
   *
   * @param arg - Argument to list files
   */
  public list: FileMetadataClient['list'] = (arg) => {
    return this.metadataClient.list(arg);
  };

  /**
   * See {@link BlobStorageClient.upload}
   *
   * @param rs - Readable stream to upload
   * @param options - Argument for uploads
   */
  public upload: BlobStorageClient['upload'] = (rs, options) => {
    return this.blobStorageClient.upload(rs, {
      ...options,
      transforms: [enforceMaxByteSizeTransform(this.fileKindDescriptor.maxSizeBytes ?? Infinity)],
    });
  };

  /**
   * See {@link BlobStorageClient.download}
   *
   * @param args - to download a file
   */
  public download: BlobStorageClient['download'] = (args) => {
    return this.blobStorageClient.download(args);
  };
}
