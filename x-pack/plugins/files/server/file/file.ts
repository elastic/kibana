/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/core/server';
import { omit } from 'lodash';
import { Readable } from 'stream';
import {
  File as IFile,
  FileSavedObject,
  FileSavedObjectAttributes,
  FileStatus,
} from '../../common';
import { BlobStorageService } from '../blob_storage_service';
import { InternalFileService } from '../file_service';
import { fileAttributesReducer, Action } from './file_attributes_reducer';

/**
 * Public file class that wraps all functionality consumers will need at the
 * individual file level
 */
export class File<M = {}> implements IFile {
  constructor(
    private readonly fileService: InternalFileService,
    private readonly blobStorageService: BlobStorageService,
    private fileSO: FileSavedObject,
    private readonly logger: Logger
  ) {}

  private async updateFileState(action: Action) {
    const nextAttr = fileAttributesReducer(this.attributes, action);
    const nextFileSO = await this.fileService.updateFileSO(this.id, nextAttr);
    this.fileSO = {
      ...nextFileSO,
      references: nextFileSO.references ?? [],
      attributes: {
        ...this.fileSO,
        ...nextAttr,
      },
    };
  }

  private hasContent(): boolean {
    return Boolean(this.fileSO.attributes.status === 'READY' && this.fileSO.attributes.content_ref);
  }

  async update(
    attrs: Partial<{ meta?: M | undefined; alt?: string | undefined; name: string }>
  ): Promise<IFile> {
    await this.updateFileState({
      action: 'updateFile',
      payload: { ...attrs, name: this.name },
    });

    return this;
  }

  // TODO: Use security audit logger to log file content upload
  async uploadContent(content: Readable): Promise<void> {
    if (this.hasContent()) {
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
    } catch (e) {
      await this.updateFileState({ action: 'uploadError' });
      throw e;
    }
  }

  downloadContent(): Promise<Readable> {
    if (!this.hasContent()) {
      throw new Error('No content to download');
    }
    const { content_ref: id, size } = this.attributes;
    return this.blobStorageService.download(id!, size);
  }

  // TODO: Use security audit logger to log file deletion
  async delete(): Promise<void> {
    const { attributes, id } = this.fileSO;
    if (attributes.content_ref) {
      await this.blobStorageService.delete(attributes.content_ref);
    }
    await this.fileService.deleteFileSO(id);
  }

  public getMetadata(): Omit<FileSavedObjectAttributes<{}>, 'status' | 'content_ref'> {
    return omit({ ...this.fileSO.attributes }, ['status', 'content_ref']);
  }

  public get id(): string {
    return this.fileSO.id;
  }

  public get attributes(): FileSavedObjectAttributes {
    return this.fileSO.attributes;
  }

  public get name(): string {
    return this.fileSO.attributes.name;
  }

  public get status(): FileStatus {
    return this.fileSO.attributes.status;
  }
}
