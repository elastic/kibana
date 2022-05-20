/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/core/server';
import { Readable } from 'stream';
import {
  File as IFile,
  FileSavedObject,
  FileSavedObjectAttributes,
  FileStatus,
  UpdatableFileAttributes,
} from '../../common';
import { BlobStorageService } from '../blob_storage_service';
import {
  fileAttributesReducer,
  Action,
  createDefaultFileAttributes,
} from './file_attributes_reducer';
import { createAuditEvent } from '../audit_events';
import { InternalFileService } from '../file_service/internal_file_service';

/**
 * Public class that provides all data and functionality consumers will need at the
 * individual file level
 */
export class File<M = unknown> implements IFile {
  private readonly logAuditEvent: InternalFileService['createAuditLog'];

  constructor(
    private fileSO: FileSavedObject,
    private readonly internalFileService: InternalFileService,
    private readonly blobStorageService: BlobStorageService,
    private readonly logger: Logger
  ) {
    this.logAuditEvent = this.internalFileService.createAuditLog.bind(this.internalFileService);
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

  public async update(attrs: UpdatableFileAttributes): Promise<IFile> {
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
      const { id: contentRef, size } = await this.blobStorageService.upload(content);
      await this.updateFileState({
        action: 'uploaded',
        payload: { content_ref: contentRef, size },
      });
    } catch (e) {
      await this.updateFileState({ action: 'uploadError' });
      throw e;
    }
  }

  public downloadContent(): Promise<Readable> {
    const { content_ref: id, size } = this.attributes;
    if (!id) {
      throw new Error('No content to download');
    }
    return this.blobStorageService.download(id, size);
  }

  public async delete(): Promise<void> {
    const { attributes, id } = this.fileSO;
    if (attributes.content_ref) {
      await this.blobStorageService.delete(attributes.content_ref);
    }
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
    { name, fileKind, alt, meta }: { name: string; fileKind: string; alt?: string; meta?: unknown },
    internalFileService: InternalFileService
  ) {
    const fileSO = await internalFileService.createSO({
      ...createDefaultFileAttributes(),
      file_kind: fileKind,
      name,
      alt,
      meta,
    });
    const file = internalFileService.toFile(fileSO);
    internalFileService.createAuditLog(
      createAuditEvent({
        action: 'create',
        message: `Created file "${file.name}" of kind "${file.fileKind}" and id "${file.id}"`,
      })
    );
    return file;
  }

  private get attributes(): FileSavedObjectAttributes {
    return this.fileSO.attributes;
  }

  public get id(): string {
    return this.fileSO.id;
  }

  public get fileKind(): string {
    return this.attributes.file_kind;
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
}
