/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import type { SavedObject } from '@kbn/core/server';
import { Readable } from 'stream';

export type FileStatus = 'AWAITING_UPLOAD' | 'UPLOADING' | 'READY' | 'UPLOAD_ERROR';

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type FileSavedObjectAttributes<Meta = unknown> = {
  created_at: string;

  updated_at: string;

  /**
   * User-friendly name given to the file
   */
  name: string;

  /**
   * Unique identifier of the kind of file. Kibana applications can register
   * these at runtime.
   */
  file_kind: string;

  status: FileStatus;

  /**
   * An alternate even more human-friendly name for the contents. This should be
   * usable by, for example, the alt attribute in image tags if the content is an
   * image.
   */
  alt?: string;

  /**
   * A unique ID for file content that enables retrieval from a blob store.
   *
   * May not be available at the time this object is created
   */
  content_ref?: string;

  /**
   * MIME type of the file content, e.g.: image/png.
   */
  mime?: string;

  /**
   * A file extension like .png or .jpeg which can be used to filter for specific
   * file types when uploading to this target or when filtering across all files.
   */
  extension?: string;

  /**
   * Size of the contents in bytes.
   */
  size?: number;

  /**
   * User-defined metadata
   */
  meta?: Meta;
};

export type FileSavedObject<Meta = unknown> = SavedObject<FileSavedObjectAttributes<Meta>>;

export type UpdatableFileAttributes = Pick<FileSavedObjectAttributes, 'meta' | 'alt' | 'name'>;

export interface File<Meta = unknown> {
  id: string;
  fileKind: string;
  name: string;
  status: FileStatus;
  /**
   * User provided metadata
   */
  meta: Meta;
  alt: undefined | string;

  update(attr: Partial<UpdatableFileAttributes>): Promise<File>;
  uploadContent(content: Readable): Promise<void>;
  downloadContent(): Promise<Readable>;
  delete(): Promise<void>;
}
