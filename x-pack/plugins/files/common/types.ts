/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import type { SavedObject } from '@kbn/core/server';
import type { Readable } from 'stream';
import type { ES_FIXED_SIZE_INDEX_BLOB_STORE } from './constants';

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
   * Extension that should match the full mime type
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

/**
 * Attributes of a file that represent a serialised version of the file.
 */
export type FileJSON = FileSavedObjectAttributes & { id: string };

export type FileSavedObject<Meta = unknown> = SavedObject<FileSavedObjectAttributes<Meta>>;

export type UpdatableFileAttributes<Meta = unknown> = Pick<
  FileSavedObjectAttributes<Meta>,
  'meta' | 'alt' | 'name'
>;

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type FileShareSavedObjectAttributes = {
  created_at: string;

  /**
   * ID of the file being shared publicly
   */
  file: string;

  /**
   * Human friendly name for this share token.
   */
  name?: string;

  /**
   * The date-time this file share will expire.
   *
   * @note default date-time is determined by this application
   *
   * TODO: in future we could add a special value like "forever", but this should
   * not be the default.
   */
  valid_until?: string;
};

/**
 * Attributes of a file that represent a serialised version of the file.
 */
export type FileShareJSON = FileShareSavedObjectAttributes & { id: string };

export type UpdatableFileShareAttributes = Pick<FileSavedObjectAttributes, 'name'>;

/**
 * The set of properties and behaviors of the "smart" file object. This is built
 * directly from the set of saved object attributes
 */
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

  /**
   * MIME type of the file content, e.g.: image/png.
   */
  mime: undefined | string;

  extension: undefined | string;

  update(attr: Partial<UpdatableFileAttributes<Meta>>): Promise<File<Meta>>;

  uploadContent(content: Readable): Promise<void>;

  downloadContent(): Promise<Readable>;

  delete(): Promise<void>;

  share(opts?: { name?: string; validUntil?: string }): Promise<FileShareJSON>;

  listShares(): Promise<FileShareJSON[]>;

  unshare(opts: {
    /**
     * Specify the share instance to remove
     */
    shareId: string;
  }): Promise<void>;

  toJSON(): FileJSON;
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
  [ES_FIXED_SIZE_INDEX_BLOB_STORE]?: {
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
    getById?: {
      tags: string[];
    };
    list?: {
      tags: string[];
    };
    download?: {
      tags: string[];
    };
  };
}
