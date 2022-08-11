/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Readable } from 'stream';
import cuid from 'cuid';
import { FileKind, FileMetadata } from '../../common/types';
import type { FileMetadataClient } from './file_metadata_client';
import type {
  BlobStorageClient,
  UploadOptions as BlobUploadOptions,
} from '../blob_storage_service';
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
 * Args to create a file
 */
export interface CreateArgs {
  /**
   * Unique file ID
   */
  id?: string;
  /**
   * The file's metadata
   */
  metadata: Omit<FileMetadata, 'FileKind'> & { FileKind?: string };
}

export type UploadOptions = Omit<BlobUploadOptions, 'id'>;

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
  create(arg: CreateArgs): ReturnType<FileMetadataClient['create']>;

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
   * See {@link FileMetadataClient.find}.
   *
   * @param arg - Argument to find files
   */
  find: FileMetadataClient['find'];

  /**
   * See {@link BlobStorageClient.upload}
   *
   * @param id - Readable stream to upload
   * @param rs - Readable stream to upload
   * @param opts - Argument for uploads
   */
  upload(id: string, rs: Readable, opts?: UploadOptions): ReturnType<BlobStorageClient['upload']>;

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

  public create = async ({
    id,
    metadata,
  }: CreateArgs): ReturnType<FileMetadataClient['create']> => {
    return this.metadataClient.create({
      id: id || cuid(),
      metadata: {
        FileKind: this.fileKind,
        ...metadata,
      },
    });
  };

  public get: FileMetadataClient['get'] = async (arg) => {
    return this.metadataClient.get(arg);
  };

  public update: FileMetadataClient['update'] = (arg) => {
    return this.metadataClient.update(arg);
  };

  public find: FileMetadataClient['find'] = (arg) => {
    return this.metadataClient.find(arg);
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

  /**
   * Upload a blob
   * @param id - The ID of the file content is associated with
   * @param rs - The readable stream of the file content
   * @param options - Options for the upload
   */
  public upload = async (
    id: string,
    rs: Readable,
    options?: UploadOptions
  ): ReturnType<BlobStorageClient['upload']> => {
    return this.blobStorageClient.upload(rs, {
      ...options,
      transforms: [
        ...(options?.transforms || []),
        enforceMaxByteSizeTransform(this.fileKindDescriptor.maxSizeBytes ?? Infinity),
      ],
      id,
    });
  };

  public download: BlobStorageClient['download'] = (args) => {
    return this.blobStorageClient.download(args);
  };
}
