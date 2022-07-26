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
   * The file extension, for example "jpg", "png", "svg" and so forth
   */
  extension?: string;

  /**
   * Alternate text that can be used used to describe the contents of the file
   * in human-friendly language
   */
  Alt?: string;

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
  extension: FileSavedObjectAttributes['extension'];

  meta: FileSavedObjectAttributes<Meta>['Meta'];
  alt: FileSavedObjectAttributes['Alt'];
  fileKind: FileSavedObjectAttributes['FileKind'];
  status: FileSavedObjectAttributes['Status'];
}

export type FileSavedObject<Meta = unknown> = SavedObject<FileSavedObjectAttributes<Meta>>;

export type UpdatableFileAttributes<Meta = unknown> = Pick<FileJSON<Meta>, 'meta' | 'alt' | 'name'>;

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type FileShareSavedObjectAttributes = {
  created: string;

  /**
   * Secret token used to access the associated file.
   */
  token: string;

  /**
   * Human friendly name for this share token.
   */
  name?: string;

  /**
   * The unix timestamp (in milliseconds) this file share will expire.
   *
   * TODO: in future we could add a special value like "forever", but this should
   * not be the default.
   */
  valid_until: number;
};

/**
 * Attributes of a file that represent a serialised version of the file.
 */
export interface FileShareJSON {
  id: string;
  created: FileShareSavedObjectAttributes['created'];
  validUntil: FileShareSavedObjectAttributes['valid_until'];
  name?: FileShareSavedObjectAttributes['name'];
  fileId: string;
}

export type FileShareJSONWithToken = FileShareJSON & { token: string };

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

  share(opts?: { name?: string; validUntil?: number }): Promise<FileShareJSONWithToken>;

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

interface HttpEndpointDefinition {
  /**
   * Specify the tags for this endpoint.
   *
   * @example
   * // This will enable access control to this endpoint for users that can access "myApp" only.
   * { tags: ['access:myApp'] }
   *
   */
  tags: string[];
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
   * Optionally specify which HTTP routes to create for the file kind
   */
  http: {
    /**
     * Enable creating this file type
     */
    create?: HttpEndpointDefinition;
    /**
     * Enable the file metadata to updated
     */
    update?: HttpEndpointDefinition;
    /**
     * Enable the file to be deleted (metadata and contents)
     */
    delete?: HttpEndpointDefinition;
    /**
     * Enable file to be retrieved by ID.
     */
    getById?: HttpEndpointDefinition;
    /**
     * Enable file to be listed
     */
    list?: HttpEndpointDefinition;
    /**
     * Enable the file to be downloaded
     */
    download?: HttpEndpointDefinition;
    /**
     * Enable the file to be shared publicly
     */
    share?: HttpEndpointDefinition;
  };
}

export interface FilesMetrics {
  storage: {
    [ES_FIXED_SIZE_INDEX_BLOB_STORE]: {
      /**
       * The total size in bytes that can be used in this storage medium
       */
      capacity: number;
      /**
       * Bytes currently used
       */
      used: number;
      /**
       * Bytes currently available
       */
      available: number;
    };
  };
  countByStatus: Record<FileStatus, number>;
  countByExtension: Record<string, number>;
}
