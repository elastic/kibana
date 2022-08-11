/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/core/server';
import mimeType from 'mime';
import { Readable } from 'stream';
import type { FileCompression, FileShareJSON, FileShareJSONWithToken } from '../../common/types';
import type {
  File as IFile,
  FileKind,
  FileMetadata,
  FileStatus,
  UpdatableFileMetadata,
  FileJSON,
} from '../../common';
import {
  fileAttributesReducer,
  Action,
  createDefaultFileAttributes,
} from './file_attributes_reducer';
import { createAuditEvent } from '../audit_events';
import { InternalFileService } from '../file_service/internal_file_service';
import { InternalFileShareService } from '../file_share_service';
import type { FileClientImpl } from '../file_client/file_client';
import { toJSON } from './to_json';
import {
  AlreadyDeletedError,
  ContentAlreadyUploadedError,
  NoDownloadAvailableError,
  UploadInProgressError,
} from './errors';

/**
 * Public class that provides all data and functionality consumers will need at the
 * individual file level
 *
 * @note Instantiation should not happen outside of this plugin
 */
export class File<M = unknown> implements IFile {
  private readonly logAuditEvent: InternalFileService['writeAuditLog'];

  constructor(
    public readonly id: string,
    private fileMetadata: FileMetadata,
    private readonly fileClient: FileClientImpl,
    private readonly internalFileService: InternalFileService,
    private readonly fileShareService: InternalFileShareService,
    private readonly logger: Logger
  ) {
    this.logAuditEvent = this.internalFileService.writeAuditLog.bind(this.internalFileService);
  }

  private async updateFileState(action: Action) {
    const { metadata } = await this.fileClient.update({
      id: this.id,
      metadata: fileAttributesReducer(this.metadata, action),
    });
    this.fileMetadata = metadata;
  }

  private isReady(): boolean {
    return this.status === 'READY';
  }

  private isDeleted(): boolean {
    return this.status === 'DELETED';
  }

  private uploadInProgress(): boolean {
    return this.status === 'UPLOADING';
  }

  public async update(attrs: Partial<UpdatableFileMetadata>): Promise<IFile> {
    await this.updateFileState({
      action: 'updateFile',
      payload: attrs,
    });
    return this;
  }

  public async uploadContent(content: Readable): Promise<void> {
    if (this.uploadInProgress()) {
      throw new UploadInProgressError('Upload already in progress.');
    }
    if (this.isReady()) {
      throw new ContentAlreadyUploadedError('Already uploaded file content.');
    }
    this.logger.debug(`Uploading file [id = ${this.id}][name = ${this.name}].`);
    await this.updateFileState({
      action: 'uploading',
    });

    try {
      const { size } = await this.fileClient.upload(this.id, content);
      await this.updateFileState({
        action: 'uploaded',
        payload: { size },
      });
    } catch (e) {
      await this.updateFileState({ action: 'uploadError' });
      this.fileClient.deleteContent(this.id).catch(() => {}); // Best effort to remove any uploaded content
      throw e;
    }
  }

  public downloadContent(): Promise<Readable> {
    const { size } = this.metadata;
    if (!this.isReady()) {
      throw new NoDownloadAvailableError('This file content is not available for download.');
    }
    // We pass through this file ID to retrieve blob content.
    return this.fileClient.download({ id: this.id, size });
  }

  public async delete(): Promise<void> {
    if (this.uploadInProgress()) {
      throw new UploadInProgressError('Cannot delete file while upload in progress');
    }
    if (this.isDeleted()) {
      throw new AlreadyDeletedError('File has already been deleted');
    }
    await this.updateFileState({
      action: 'delete',
    });
    // Stop sharing this file
    await this.fileShareService.deleteForFile({ file: this });
    await this.fileClient.delete({ id: this.id, hasContent: this.isReady() });
    this.logAuditEvent(
      createAuditEvent({
        action: 'delete',
        outcome: 'success',
        message: `Deleted file "${this.name}" of kind "${this.fileKind}" with id "${this.id}"`,
      })
    );
  }

  public async share({
    name,
    validUntil,
  }: {
    name?: string;
    validUntil?: number;
  }): Promise<FileShareJSONWithToken> {
    const shareObject = await this.fileShareService.share({ file: this, name, validUntil });
    this.internalFileService.writeAuditLog(
      createAuditEvent({
        action: 'create',
        message: `Shared file "${this.name}" with id "${this.id}"`,
      })
    );
    return shareObject;
  }

  async listShares(): Promise<FileShareJSON[]> {
    const { shares } = await this.fileShareService.list({ fileId: this.id });
    return shares;
  }

  async unshare(opts: { shareId: string }): Promise<void> {
    await this.fileShareService.delete({ id: opts.shareId });
    this.internalFileService.writeAuditLog(
      createAuditEvent({
        action: 'delete',
        message: `Removed share for "${this.name}" with id "${this.id}"`,
      })
    );
  }

  public toJSON(): FileJSON<M> {
    return toJSON<M>(this.id, this.metadata);
  }

  private get metadata(): FileMetadata {
    return this.fileMetadata;
  }

  public get created(): string {
    return this.metadata.created;
  }

  public get updated(): string {
    return this.metadata.Updated;
  }

  public get chunkSize(): number | undefined {
    return this.metadata.ChunkSize;
  }

  public get fileKind(): string {
    return this.fileClient.fileKind;
  }

  public get name(): string {
    return this.metadata.name;
  }

  public get status(): FileStatus {
    return this.metadata.Status;
  }

  public get compression(): undefined | FileCompression {
    return this.metadata.Compression;
  }

  public get size(): undefined | number {
    return this.metadata.size;
  }

  public get meta(): M {
    return this.metadata.Meta as M;
  }

  public get alt(): undefined | string {
    return this.metadata.Alt;
  }

  public get mimeType(): undefined | string {
    return this.metadata.mime_type;
  }

  public get extension(): undefined | string {
    return this.metadata.extension;
  }

  /**
   * Static method for creating files so that we can keep all of the audit logging for files
   * in the same place.
   */
  public static async create(
    {
      name,
      fileKind,
      alt,
      meta,
      mime,
    }: { name: string; fileKind: FileKind; alt?: string; meta?: unknown; mime?: string },
    internalFileService: InternalFileService,
    fileClient: FileClientImpl
  ) {
    const fileMeta = await fileClient.create({
      metadata: {
        ...createDefaultFileAttributes(),
        name,
        mime_type: mime,
        Alt: alt,
        Meta: meta,
        FileKind: fileKind.id,
        extension: (mime && mimeType.getExtension(mime)) ?? undefined,
      },
    });

    const file = internalFileService.toFile(fileMeta.id, fileMeta.metadata, fileKind, fileClient);

    internalFileService.writeAuditLog(
      createAuditEvent({
        action: 'create',
        message: `Created file "${file.name}" of kind "${file.fileKind}" and id "${file.id}"`,
      })
    );

    return file;
  }
}
