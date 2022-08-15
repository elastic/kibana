/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/core/server';
import { Readable } from 'stream';
import type { FileCompression, FileShareJSON, FileShareJSONWithToken } from '../../common/types';
import type {
  File as IFile,
  FileMetadata,
  FileStatus,
  UpdatableFileMetadata,
  FileJSON,
} from '../../common';
import { fileAttributesReducer, Action } from './file_attributes_reducer';
import type { FileClientImpl } from '../file_client/file_client';
import { toJSON } from './to_json';
import {
  AlreadyDeletedError,
  ContentAlreadyUploadedError,
  NoDownloadAvailableError,
  UploadInProgressError,
} from './errors';

/**
 * @internal
 */
export class File<M = unknown> implements IFile {
  constructor(
    public readonly id: string,
    private readonly fileMetadata: FileMetadata,
    private readonly fileClient: FileClientImpl,
    private readonly logger: Logger
  ) {}

  private async updateFileState(action: Action): Promise<File<M>> {
    return await this.fileClient.update<M>({
      id: this.id,
      metadata: fileAttributesReducer(this.metadata, action),
    });
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

  public async update(attrs: Partial<UpdatableFileMetadata>): Promise<File<M>> {
    return this.updateFileState({
      action: 'updateFile',
      payload: attrs,
    });
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
    await this.fileClient.delete({ id: this.id, hasContent: this.isReady() });
  }

  public async share({
    name,
    validUntil,
  }: {
    name: string;
    validUntil?: number;
  }): Promise<FileShareJSONWithToken> {
    return this.fileClient.share({ name, validUntil, file: this });
  }

  async listShares(): Promise<FileShareJSON[]> {
    const { shares } = await this.fileClient.listShares({
      fileId: this.id,
    });
    return shares;
  }

  async unshare(opts: { shareId: string }): Promise<void> {
    await this.fileClient.unshare({ id: opts.shareId });
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
}
