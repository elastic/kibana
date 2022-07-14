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

export type FileCompression = 'br' | 'gzip' | 'deflate' | 'none';

/**
 * File metadata fields are defined per the ECS specification:
 *
 * https://www.elastic.co/guide/en/ecs/current/ecs-file.html
 *
 * Custom fields are named according to the custom field convention: "CustomFieldName".
 *
 * TODO: Consider moving this to a commonly shareable package
 */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type FileMetadata = {
  /**
   * Name of the file
   *
   * @note This field is recommended since it will provide a better UX
   */
  name?: string;

  /**
   * MIME type of the file contents
   */
  mime_type?: string;

  /**
   * ISO string representing the file creation date
   */
  created?: string;

  /**
   * Size of the file
   */
  size?: number;

  /**
   * Hash of the file's contents
   */
  hash?: {
    md5?: string;
    sha1?: string;
    sha256?: string;
    sha384?: string;
    sha512?: string;
    ssdeep?: string;
    tlsh?: string;
    [hashName: string]: string | undefined;
  };

  /**
   * Alternate text that can be used used to describe the contents of the file
   * in human-friendly language
   */
  Alt?: string;

  /**
   * The file extension, for example "jpg", "png", "svg" and so forth
   */
  Extension?: string;

  /**
   * ISO string representing when the file was last updated
   */
  Updated?: string;

  /**
   * The file's current status
   */
  Status?: FileStatus;

  /**
   * The maximum number of bytes per file chunk
   */
  ChunkSize?: number;

  /**
   * Compression algorithm used to transform chunks before they were stored.
   */
  Compression?: FileCompression;
};

export type FileSavedObjectAttributes<Meta = unknown> = Required<
  Pick<FileMetadata, 'created' | 'name' | 'Status' | 'Updated'>
> &
  FileMetadata & {
    /**
     * Unique identifier of the kind of file. Kibana applications can register
     * these at runtime.
     */
    FileKind: string;

    /**
     * User-defined metadata
     */
    Meta?: Meta;
  };

/**
 * Attributes of a file that represent a serialised version of the file.
 */
export interface FileJSON<Meta = unknown> {
  id: string;
  created: FileSavedObjectAttributes['created'];
  updated: FileSavedObjectAttributes['Updated'];
  name: FileSavedObjectAttributes['name'];
  mimeType: FileSavedObjectAttributes['mime_type'];
  size: FileSavedObjectAttributes['size'];

  meta: FileSavedObjectAttributes<Meta>['Meta'];
  extension: FileSavedObjectAttributes['Extension'];
  alt: FileSavedObjectAttributes['Alt'];
  chunkSize: FileSavedObjectAttributes['ChunkSize'];
  fileKind: FileSavedObjectAttributes['FileKind'];
  compression: FileSavedObjectAttributes['Compression'];
  status: FileSavedObjectAttributes['Status'];
}

export type FileSavedObject<Meta = unknown> = SavedObject<FileSavedObjectAttributes<Meta>>;

export type UpdatableFileAttributes<Meta = unknown> = Pick<FileJSON<Meta>, 'meta' | 'alt' | 'name'>;

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type FileShareSavedObjectAttributes = {
  created_at: string;

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
  valid_until?: number;
};

/**
 * Attributes of a file that represent a serialised version of the file.
 */
export type FileShareJSON = FileShareSavedObjectAttributes & { id: string; fileId: string };

export type UpdatableFileShareAttributes = Pick<FileSavedObjectAttributes, 'name'>;

/**
 * The set of properties and behaviors of the "smart" file object and adds
 * behaviours for interacting with files on top of the pure data.
 */
export interface File<Meta = unknown> extends FileJSON<Meta> {
  update(attr: Partial<UpdatableFileAttributes<Meta>>): Promise<File<Meta>>;

  uploadContent(content: Readable): Promise<void>;

  downloadContent(): Promise<Readable>;

  delete(): Promise<void>;

  share(opts?: { name?: string; validUntil?: number }): Promise<FileShareJSON>;

  listShares(): Promise<FileShareJSON[]>;

  unshare(opts: {
    /**
     * Specify the share instance to remove
     */
    shareId: string;
  }): Promise<void>;

  toJSON(): FileJSON<Meta>;
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
