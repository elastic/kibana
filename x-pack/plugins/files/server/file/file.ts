/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/core/server';
import mimeType from 'mime';
import { Readable } from 'stream';
import { FileShareJSON } from '../../common/types';
import {
  File as IFile,
  FileKind,
  FileSavedObject,
  FileSavedObjectAttributes,
  FileStatus,
  UpdatableFileAttributes,
  FileJSON,
} from '../../common';
import { BlobStorageService } from '../blob_storage_service';
import {
  fileAttributesReducer,
  Action,
  createDefaultFileAttributes,
} from './file_attributes_reducer';
import { createAuditEvent } from '../audit_events';
import { InternalFileService } from '../file_service/internal_file_service';
import { FileShareService } from '../file_share_service';
import { BlobStorage } from '../blob_storage_service/types';
import { enforceMaxByteSizeTransform } from './stream_transforms';

/**
 * Public class that provides all data and functionality consumers will need at the
 * individual file level
 *
 * @note Instantiation should not happen outside of this plugin
 */
export class File<M = unknown> implements IFile {
  private readonly logAuditEvent: InternalFileService['createAuditLog'];
  private readonly blobStorage: BlobStorage;

  constructor(
    private fileSO: FileSavedObject,
    private readonly fileKindDescriptor: FileKind,
    private readonly internalFileService: InternalFileService,
    private readonly blobStorageService: BlobStorageService,
    private readonly fileShareService: FileShareService,
    private readonly logger: Logger
  ) {
    this.logAuditEvent = this.internalFileService.createAuditLog.bind(this.internalFileService);
    this.blobStorage = this.blobStorageService.createBlobStore(
      fileKindDescriptor.blobStoreSettings
    );
  }

  private async updateFileState(action: Action) {
    this.fileSO = await this.internalFileService.updateSO(
      this.id,
      fileAttributesReducer(this.attributes, action)
    );
  }

  private canUpload(): boolean {
    return (
      this.fileSO.attributes.status === 'AWAITING_UPLOAD' ||
      this.fileSO.attributes.status === 'UPLOAD_ERROR'
    );
  }

  public async update(attrs: Partial<UpdatableFileAttributes>): Promise<IFile> {
    await this.updateFileState({
      action: 'updateFile',
      payload: attrs,
    });
    return this;
  }

  public async uploadContent(content: Readable): Promise<void> {
    if (!this.canUpload()) {
      throw new Error(`Already uploaded file [id = ${this.id}][name = ${this.name}].`);
    }
    this.logger.debug(`Uploading file [id = ${this.id}][name = ${this.name}].`);
    await this.updateFileState({
      action: 'uploading',
    });

    try {
      const { id: contentRef, size } = await this.blobStorage.upload(content, {
        transforms: [enforceMaxByteSizeTransform(this.fileKindDescriptor.maxSizeBytes ?? Infinity)],
      });
      await this.updateFileState({
        action: 'uploaded',
        payload: { content_ref: contentRef, size },
      });
    } catch (e) {
      await this.updateFileState({ action: 'uploadError' });
      this.blobStorage.delete(this.id).catch(() => {}); // Best effort to remove any uploaded content
      throw e;
    }
  }

  public downloadContent(): Promise<Readable> {
    const { content_ref: id, size } = this.attributes;
    if (!id) {
      throw new Error('No content to download');
    }
    if (this.status !== 'READY') {
      throw new Error('This file is not ready for download.');
    }
    return this.blobStorage.download({ id, size });
  }

  public async delete(): Promise<void> {
    const { attributes, id } = this.fileSO;
    await this.updateFileState({
      action: 'delete',
    });
    if (attributes.content_ref) {
      await this.blobStorage.delete(attributes.content_ref);
    }
    await this.fileShareService.deleteForFile({ file: this });
    await this.internalFileService.deleteSO(id);
    this.logAuditEvent(
      createAuditEvent({
        action: 'delete',
        outcome: 'success',
        message: `Deleted file "${this.name}" of kind "${this.fileKind}" with id "${this.id}"`,
      })
    );
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
    internalFileService: InternalFileService
  ) {
    const fileSO = await internalFileService.createSO({
      ...createDefaultFileAttributes(),
      file_kind: fileKind.id,
      name,
      alt,
      meta,
      mime,
      extension: (mime && mimeType.getExtension(mime)) ?? undefined,
    });

    const file = internalFileService.toFile(fileSO, fileKind);

    internalFileService.createAuditLog(
      createAuditEvent({
        action: 'create',
        message: `Created file "${file.name}" of kind "${file.fileKind}" and id "${file.id}"`,
      })
    );

    return file;
  }

  public async share({
    name,
    validUntil,
  }: {
    name?: string;
    validUntil?: string;
  }): Promise<FileShareJSON> {
    const shareObject = await this.fileShareService.share({ file: this, name, validUntil });
    this.internalFileService.createAuditLog(
      createAuditEvent({
        action: 'create',
        message: `Shared file "${this.name}" with id "${this.id}"`,
      })
    );
    return shareObject;
  }

  async listShares(): Promise<FileShareJSON[]> {
    return await this.fileShareService.list({ file: this });
  }

  async unshare(opts: { shareId: string }): Promise<void> {
    await this.fileShareService.delete({ tokenId: opts.shareId });
    this.internalFileService.createAuditLog(
      createAuditEvent({
        action: 'delete',
        message: `Removed share for "${this.name}" with id "${this.id}"`,
      })
    );
  }

  public toJSON(): FileJSON {
    return {
      ...this.attributes,
      id: this.id,
    };
  }

  private get attributes(): FileSavedObjectAttributes {
    return this.fileSO.attributes;
  }

  public get id(): string {
    return this.fileSO.id;
  }

  public get fileKind(): string {
    return this.fileKindDescriptor.id;
  }

  public get name(): string {
    return this.attributes.name;
  }

  public get status(): FileStatus {
    return this.attributes.status;
  }

  public get meta(): M {
    return this.attributes.meta as M;
  }

  public get alt(): undefined | string {
    return this.attributes.alt;
  }

  public get mime(): undefined | string {
    return this.attributes.mime;
  }

  public get extension(): undefined | string {
    return this.attributes.extension;
  }
}
