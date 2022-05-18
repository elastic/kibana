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
import { fileAttributesReducer, Action } from './file_attributes_reducer';

interface InternalSavedObjectsClient {
  deleteSO(id: string): Promise<void>;
  updateSO(id: string, attr: FileSavedObjectAttributes): Promise<FileSavedObject>;
}

/**
 * Public file class that wraps all functionality consumers will need at the
 * individual file level
 */
export class File<M = unknown> implements IFile {
  constructor(
    private readonly soClient: InternalSavedObjectsClient,
    private readonly blobStorageService: BlobStorageService,
    private fileSO: FileSavedObject,
    private readonly logger: Logger
  ) {}

  private async updateFileState(action: Action) {
    this.fileSO = await this.soClient.updateSO(
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

  async update(attrs: UpdatableFileAttributes): Promise<IFile> {
    await this.updateFileState({
      action: 'updateFile',
      payload: attrs,
    });

    return this;
  }

  // TODO: Use security audit logger to log file content upload
  async uploadContent(content: Readable): Promise<void> {
    if (!this.canUpload()) {
      this.logger.error('File content already uploaded.');
      throw new Error('File content already uploaded');
    }
    this.logger.debug('Uploading file contents...');
    await this.updateFileState({
      action: 'uploading',
    });

    try {
      const { id: contentRef, size } = await this.blobStorageService.upload(content);
      await this.updateFileState({
        action: 'uploaded',
        payload: { content_ref: contentRef, size },
      });
      this.logger.debug(`File uploaded. New file ID: "${contentRef}".`);
    } catch (e) {
      await this.updateFileState({ action: 'uploadError' });
      throw e;
    }
  }

  downloadContent(): Promise<Readable> {
    const { content_ref: id, size } = this.attributes;
    if (!id) {
      throw new Error('No content to download');
    }
    return this.blobStorageService.download(id, size);
  }

  // TODO: Use security audit logger to log file deletion
  async delete(): Promise<void> {
    const { attributes, id } = this.fileSO;
    if (attributes.content_ref) {
      await this.blobStorageService.delete(attributes.content_ref);
    }
    await this.soClient.deleteSO(id);
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
