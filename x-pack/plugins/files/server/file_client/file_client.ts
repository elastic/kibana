/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Readable } from 'stream';
import mimeType from 'mime';
import cuid from 'cuid';
import type { Logger } from '@kbn/core/server';
import type { AuditLogger } from '@kbn/security-plugin/server';
import { FileKind, FileMetadata, FileShareJSONWithToken } from '../../common/types';
import type { FileMetadataClient } from './file_metadata_client';
import type {
  BlobStorageClient,
  UploadOptions as BlobUploadOptions,
} from '../blob_storage_service';
import { File } from '../file';
import { createDefaultFileAttributes } from '../file/file_attributes_reducer';
import { FileShareServiceStart, InternalFileShareService } from '../file_share_service';
import { enforceMaxByteSizeTransform } from './stream_transforms';
import { createAuditEvent } from '../audit_events';

type P1<F extends (...args: any[]) => any> = Parameters<F>[0];

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

/**
 * File share args
 */
interface ShareArgs {
  /**
   * Name of the file share
   */
  name?: string;
  /**
   * Unix timestamp (in milliseconds) when the file share will expire
   */
  validUntil?: number;
  /**
   * The file to share
   */
  file: File;
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
  create<M = unknown>(arg: CreateArgs): Promise<File<M>>;

  /**
   * See {@link FileMetadataClient.get}
   *
   * @param arg - Argument to get a file
   */
  get<M = unknown>(arg: P1<FileMetadataClient['get']>): Promise<File<M>>;

  /**
   * {@link FileMetadataClient.update}
   *
   * @param arg - Argument to get a file
   */
  update<M = unknown>(arg: P1<FileMetadataClient['update']>): Promise<File<M>>;

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

  /**
   * Create a file share instance for this file.
   *
   * @note this will only work for files that are share capable.
   *
   * @param args - Arguments to create a file share
   */
  share(args: ShareArgs): Promise<FileShareJSONWithToken>;
  /**
   * Create a file share instance for this file.
   *
   * @note this will only work for files that are share capable.
   *
   * @param args - Arguments to remove a file share
   */
  unshare: FileShareServiceStart['delete'];
  /**
   * Create a file share instance for this file.
   *
   * @note this will only work for files that are share capable.
   *
   * @param arg - Arguments to remove a file share
   */
  listShares: FileShareServiceStart['list'];
}
export class FileClientImpl implements FileClient {
  private readonly logAuditEvent: AuditLogger['log'];

  constructor(
    private fileKindDescriptor: FileKind,
    private readonly metadataClient: FileMetadataClient,
    private readonly blobStorageClient: BlobStorageClient,
    private readonly internalFileShareService: undefined | InternalFileShareService,
    auditLogger: undefined | AuditLogger,
    private readonly logger: Logger
  ) {
    this.logAuditEvent =
      auditLogger?.log.bind(auditLogger) ??
      ((e) => e && this.logger.info(JSON.stringify(e.event, null, 2)));
  }

  public get fileKind(): string {
    return this.fileKindDescriptor.id;
  }

  public async create<M = unknown>({ id, metadata }: CreateArgs): Promise<File<M>> {
    const result = await this.metadataClient.create({
      id: id || cuid(),
      metadata: {
        ...metadata,
        FileKind: this.fileKind,
      },
    });
    this.logAuditEvent(
      createAuditEvent({
        action: 'create',
        message: `Created file "${result.metadata.name}" of kind "${this.fileKind}" and id "${result.id}"`,
      })
    );
    return this.instantiateFile({
      ...result.metadata,
      id: result.id,
      fileKind: this.fileKind,
    });
  }

  public async get<M = unknown>(arg: P1<FileMetadataClient['get']>): Promise<File<M>> {
    const { id, metadata } = await this.metadataClient.get(arg);
    return this.instantiateFile({
      id,
      ...metadata,
      fileKind: this.fileKind,
    });
  }

  public async update<M = unknown>(arg: P1<FileMetadataClient['update']>): Promise<File<M>> {
    const { id, metadata } = await this.metadataClient.update(arg);
    return this.instantiateFile({
      id,
      ...metadata,
      fileKind: this.fileKind,
    });
  }

  public find: FileMetadataClient['find'] = (arg) => {
    return this.metadataClient.find(arg);
  };

  public async delete({ id, hasContent = true }: DeleteArgs) {
    if (this.internalFileShareService) {
      // Stop sharing this file
      await this.internalFileShareService.deleteForFile({ id });
    }
    if (hasContent) await this.blobStorageClient.delete(id);
    await this.metadataClient.delete({ id });
    this.logAuditEvent(
      createAuditEvent({
        action: 'delete',
        outcome: 'success',
        message: `Deleted file of kind "${this.fileKind}" with id "${id}"`,
      })
    );
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

  private instantiateFile<M = unknown>({
    id,
    name,
    mime,
    alt,
    meta,
    fileKind,
  }: {
    id: string;
    name: string;
    fileKind: string;
    alt?: string;
    meta?: unknown;
    mime?: string;
  }): File<M> {
    return new File(
      id,
      {
        ...createDefaultFileAttributes(),
        name,
        mime_type: mime,
        Alt: alt,
        Meta: meta,
        FileKind: fileKind,
        extension: (mime && mimeType.getExtension(mime)) ?? undefined,
      },
      this,
      this.logger
    );
  }

  async share({ file, name, validUntil }: ShareArgs): Promise<FileShareJSONWithToken> {
    if (!this.internalFileShareService) {
      throw new Error('#share not implemented');
    }
    const shareObject = await this.internalFileShareService.share({
      file,
      name,
      validUntil,
    });
    this.logAuditEvent(
      createAuditEvent({
        action: 'create',
        message: `Shared file "${file.name}" with id "${file.id}"`,
      })
    );
    return shareObject;
  }

  unshare: FileShareServiceStart['delete'] = async (arg) => {
    if (!this.internalFileShareService) {
      throw new Error('#delete shares is not implemented');
    }
    const result = await this.internalFileShareService.delete(arg);

    this.logAuditEvent(
      createAuditEvent({
        action: 'delete',
        message: `Removed share for with id "${arg.id}"`,
      })
    );

    return result;
  };

  listShares: FileShareServiceStart['list'] = (args) => {
    if (!this.internalFileShareService) {
      throw new Error('#list shares not implemented');
    }
    return this.internalFileShareService.list(args);
  };
}
