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

  public async delete({ id, hasContent = true }: { id: string; hasContent?: boolean }) {
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
