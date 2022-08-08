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

export interface DeleteArgs {
  /** ID of the file to delete */
  id: string;
  /**
   * If `true`, the file will be deleted from the blob storage.
   *
   * @default true
   */
  hasContent?: boolean;
}

/**
 * Wraps the {@link FileMetadataClient} and {@link BlobStorageClient} client
 * to provide basic file CRUD functionality.
 *
 * For now this is just a shallow type of the implementation for export purposes.
 */
export interface FileClient {
  /** See {@link FileMetadata.FileKind}.  */
  fileKind: string;

  /**
   * See {@link FileMetadataClient.create}.
   *
   * @param arg - Arg to create a file.
   * */
  create: FileMetadataClient['create'];

  /**
   * See {@link FileMetadataClient.get}
   *
   * @param arg - Argument to get a file
   */
  get: FileMetadataClient['get'];

  /**
   * {@link FileMetadataClient.update}
   *
   * @param arg - Argument to get a file
   */
  update: FileMetadataClient['update'];

  /**
   * Delete a file.
   * @param arg - Argument to delete a file
   */
  delete(arg: DeleteArgs): Promise<void>;

  /**
   * See {@link BlobStorageClient.delete}
   *
   * @param id - Argument to delete a file
   */
  deleteContent: BlobStorageClient['delete'];

  /**
   * See {@link FileMetadataClient.list}
   *
   * @param arg - Argument to list files
   */
  list: FileMetadataClient['list'];

  /**
   * See {@link BlobStorageClient.upload}
   *
   * @param content - Readable stream to upload
   * @param opts - Argument for uploads
   */
  upload: BlobStorageClient['upload'];

  /**
   * See {@link BlobStorageClient.download}
   *
   * @param args - to download a file
   */
  download: BlobStorageClient['download'];
}
export class FileClientImpl implements FileClient {
  constructor(
    private fileKindDescriptor: FileKind,
    private readonly metadataClient: FileMetadataClient,
    private readonly blobStorageClient: BlobStorageClient
  ) {}

  public get fileKind(): string {
    return this.fileKindDescriptor.id;
  }

  public create: FileMetadataClient['create'] = async (arg) => {
    return this.metadataClient.create(arg);
  };

  public get: FileMetadataClient['get'] = async (arg) => {
    return this.metadataClient.get(arg);
  };

  public update: FileMetadataClient['update'] = (arg) => {
    return this.metadataClient.update(arg);
  };

  public async delete({ id, hasContent = true }: DeleteArgs) {
    if (hasContent) await this.blobStorageClient.delete(id);
    return this.metadataClient.delete({ id });
  }

  public deleteContent: BlobStorageClient['delete'] = (arg) => {
    return this.blobStorageClient.delete(arg);
  };

  public list: FileMetadataClient['list'] = (arg) => {
    return this.metadataClient.list(arg);
  };

  public upload: BlobStorageClient['upload'] = (rs, options) => {
    return this.blobStorageClient.upload(rs, {
      ...options,
      transforms: [enforceMaxByteSizeTransform(this.fileKindDescriptor.maxSizeBytes ?? Infinity)],
    });
  };

  public download: BlobStorageClient['download'] = (args) => {
    return this.blobStorageClient.download(args);
  };
}
