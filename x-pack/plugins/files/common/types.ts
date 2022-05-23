/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import type { SavedObject } from '@kbn/core/server';
import type { Readable } from 'stream';
import type { ES_SINGLE_INDEX_BLOB_STORE } from './constants';

export type FileStatus = 'AWAITING_UPLOAD' | 'UPLOADING' | 'READY' | 'UPLOAD_ERROR' | 'DELETED';

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

export type UpdatableFileAttributes<Meta = unknown> = Pick<
  FileSavedObjectAttributes<Meta>,
  'meta' | 'alt' | 'name'
>;

export interface File<Meta = unknown> {
  id: string;

  /**
   * The ID of a {@link FileKind}.
   */
  fileKind: string;

  /**
   * The user-facing file name.
   */
  name: string;

  status: FileStatus;
  /**
   * User provided metadata
   */
  meta: Meta;
  alt: undefined | string;

  update(attr: Partial<UpdatableFileAttributes<Meta>>): Promise<File<Meta>>;

  uploadContent(content: Readable): Promise<void>;

  downloadContent(): Promise<Readable>;

  delete(): Promise<void>;
}

/**
 * Defines all the settings for supported blob stores.
 *
 * Key names map to unique blob store implementations and so must not be changed
 * without a migration
 */
export interface BlobStorageSettings {
  /**
   * Single index that supports up to 50GB of blobs
   */
  [ES_SINGLE_INDEX_BLOB_STORE]?: {
    index: string;
  };
  // Other blob store settings will go here once available
}

export interface FileKind {
  /**
   * Unique file kind ID
   */
  id: string;
  maxSizeBytes?: number;

  /**
   * The MIME type of the file content.
   *
   * @default accept all mime types
   */
  allowedMimeTypes?: string[];

  blobStoreSettings?: BlobStorageSettings;

  /**
   * Optionally specify which routes to create for the file kind
   */
  http: {
    create?: {
      tags: string[];
    };
    update?: {
      tags: string[];
    };
    delete?: {
      tags: string[];
    };
  };
}
