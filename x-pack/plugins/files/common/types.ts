/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SavedObject } from '@kbn/core/server';
import type { Observable } from 'rxjs';
import type { Readable } from 'stream';
import type { ES_FIXED_SIZE_INDEX_BLOB_STORE } from './constants';

/**
 * Values for paginating through results.
 */
export interface Pagination {
  /**
   * Page of results.
   */
  page?: number;
  /**
   * Number of results per page.
   */
  perPage?: number;
}

/**
 * Status of a file.
 *
 * AWAITING_UPLOAD  - A file object has been created but does not have any contents.
 * UPLOADING        - File contents are being uploaded.
 * READY            - File contents have been uploaded and are ready for to be downloaded.
 * UPLOAD_ERROR     - An attempt was made to upload file contents but failed.
 * DELETED          - The file contents have been or are being deleted.
 */
export type FileStatus = 'AWAITING_UPLOAD' | 'UPLOADING' | 'READY' | 'UPLOAD_ERROR' | 'DELETED';

/**
 * Supported file compression algorithms
 */
export type FileCompression = 'br' | 'gzip' | 'deflate' | 'none';

/**
 * File metadata fields are defined per the ECS specification:
 *
 * https://www.elastic.co/guide/en/ecs/current/ecs-file.html
 *
 * Custom fields are named according to the custom field convention: "CustomFieldName".
 */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type BaseFileMetadata = {
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
    /**
     * UTF-8 string representing MD5 hash
     */
    md5?: string;
    /**
     * UTF-8 string representing sha1 hash
     */
    sha1?: string;
    /**
     * UTF-8 string representing sha256 hash
     */
    sha256?: string;
    /**
     * UTF-8 string representing sha384 hash
     */
    sha384?: string;
    /**
     * UTF-8 string representing sha512 hash
     */
    sha512?: string;
    /**
     * UTF-8 string representing shadeep hash
     */
    ssdeep?: string;
    /**
     * UTF-8 string representing tlsh hash
     */
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
  CreatedBy?: string;

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

/**
 * Extra metadata on a file object specific to Kibana implementation.
 */
export type FileMetadata<Meta = unknown> = Required<
  Pick<BaseFileMetadata, 'created' | 'name' | 'Status' | 'Updated'>
> &
  BaseFileMetadata & {
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
  /**
   * Unique file ID.
   */
  id: string;
  /**
   * ISO string of when this file was created
   */
  created: FileMetadata['created'];
  /**
   * ISO string of when the file was updated
   */
  updated: FileMetadata['Updated'];
  /**
   * User who created the file
   */
  createdBy: FileMetadata['CreatedBy'];
  /**
   * File name.
   *
   * @note Does not have to be unique.
   */
  name: FileMetadata['name'];
  /**
   * MIME type of the file's contents.
   */
  mimeType: FileMetadata['mime_type'];
  /**
   * The size, in bytes, of the file content.
   */
  size: FileMetadata['size'];
  /**
   * The file extension (dot suffix).
   *
   * @note this value can be derived from MIME type but is stored for search
   * convenience.
   */
  extension: FileMetadata['extension'];

  /**
   * A consumer defined set of attributes.
   *
   * Consumers of the file service can add their own tags and identifiers to
   * a file using the "meta" object.
   */
  meta: FileMetadata<Meta>['Meta'];
  /**
   * Use this text to describe the file contents for display and accessibility.
   */
  alt: FileMetadata['Alt'];
  /**
   * A unique kind that governs various aspects of the file. A consumer of the
   * files service must register a file kind and link their files to a specific
   * kind.
   *
   * @note This enables stricter access controls to CRUD and other functionality
   * exposed by the files service.
   */
  fileKind: FileMetadata['FileKind'];
  /**
   * The current status of the file.
   *
   * See {@link FileStatus} for more details.
   */
  status: FileMetadata['Status'];
}

/**
 * An {@link SavedObject} containing a file object (i.e., metadata only).
 */
export type FileSavedObject<Meta = unknown> = SavedObject<FileMetadata<Meta>>;

/**
 * The set of file metadata that can be updated.
 */
export type UpdatableFileMetadata<Meta = unknown> = Pick<FileJSON<Meta>, 'meta' | 'alt' | 'name'>;

/**
 * Data stored with a file share object
 */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type FileShare = {
  /**
   * ISO timestamp of when the file share was created.
   */
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
  /**
   * Unique ID share instance
   */
  id: string;
  /**
   * ISO timestamp the share was created
   */
  created: FileShare['created'];
  /**
   * Unix timestamp (in milliseconds) of when this share expires
   */
  validUntil: FileShare['valid_until'];
  /**
   * A user-friendly name for the file share
   */
  name?: FileShare['name'];
  /**
   * The ID of the file this share is linked to
   */
  fileId: string;
}

/**
 * A version of the file share with a token included.
 *
 * @note This should only be shown when the file share is first created
 */
export type FileShareJSONWithToken = FileShareJSON & {
  /**
   * Secret token that can be used to access files
   */
  token: string;
};

/**
 * Set of attributes that can be updated in a file share.
 */
export type UpdatableFileShareMetadata = Pick<FileShare, 'name'>;

/**
 * Arguments to pass to share a file
 */
export interface FileShareOptions {
  /**
   * Optional name for the file share, should be human-friendly.
   */
  name?: string;
  /**
   * Unix timestamp (in milliseconds) when the file share will expire.
   *
   * @note default is 30 days
   */
  validUntil?: number;
}
/**
 * Arguments for unsharing a file
 */
export interface FileUnshareOptions {
  /**
   * Specify the share instance to remove
   */
  shareId: string;
}

/**
 * A class with set of properties and behaviors of the "smart" file object and adds
 * behaviours for interacting with files on top of the pure data.
 */
export interface File<Meta = unknown> {
  /**
   * The file ID
   */
  id: string;

  /**
   * File metadata in camelCase form.
   */
  data: FileJSON<Meta>;
  /**
   * Update a file object's metadatathat can be updated.
   *
   * @param attr - The of attributes to update.
   */
  update(attr: Partial<UpdatableFileMetadata<Meta>>): Promise<File<Meta>>;

  /**
   * Stream file content to storage.
   *
   * @param content - The content to stream to storage.
   * @param abort$ - An observable that can be used to abort the upload at any time.
   */
  uploadContent(content: Readable, abort$?: Observable<unknown>): Promise<File<Meta>>;

  /**
   * Stream file content from storage.
   */
  downloadContent(): Promise<Readable>;

  /**
   * Delete a file.
   *
   * @note This will delete the file metadata, contents and any other objects
   * related to the file owned by files.
   */
  delete(): Promise<void>;

  /**
   * Generate a secure token that can be used to access a file's content.
   *
   * @note This makes a file available for public download. Any agent with the
   * token will bypass normal authz and authn checks.
   *
   * @param opts - Share file options.
   */
  share(opts?: FileShareOptions): Promise<FileShareJSONWithToken>;

  /**
   * List all current {@link FileShareJSON} objects that have been created for
   * a file.
   */
  listShares(): Promise<FileShareJSON[]>;

  /**
   * Remove a {@link FileShareJSON} object therefore ceasing to share a file's
   * content.
   *
   * @param opts - Unshare file options
   */
  unshare(opts: FileUnshareOptions): Promise<void>;

  /**
   * Get a JSON representation of the file. Convenient for serialisation.
   */
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

/**
 * A descriptor of meta values associated with a set or "kind" of files.
 *
 * @note In order to use the file service consumers must register a {@link FileKind}
 * in the {@link FileKindsRegistry}.
 */
export interface FileKind {
  /**
   * Unique file kind ID
   */
  id: string;
  /**
   * Maximum size, in bytes, a file of this kind can be.
   *
   * @default 4MiB
   */
  maxSizeBytes?: number;

  /**
   * The MIME type of the file content.
   *
   * @default accept all mime types
   */
  allowedMimeTypes?: string[];

  /**
   * Blob store specific settings that enable configuration of storage
   * details.
   */
  blobStoreSettings?: BlobStorageSettings;

  /**
   * Specify which HTTP routes to create for the file kind.
   *
   * You can always create your own HTTP routes for working with files but
   * this interface allows you to expose basic CRUD operations, upload, download
   * and sharing of files over a RESTful-like interface.
   *
   * @note The public {@link FileClient} uses these endpoints.
   */
  http: {
    /**
     * Expose file creation (and upload) over HTTP.
     */
    create?: HttpEndpointDefinition;
    /**
     * Expose file updates over HTTP.
     */
    update?: HttpEndpointDefinition;
    /**
     * Expose file deletion over HTTP.
     */
    delete?: HttpEndpointDefinition;
    /**
     * Expose "get by ID" functionality over HTTP.
     */
    getById?: HttpEndpointDefinition;
    /**
     * Expose the ability to list all files of this kind over HTTP.
     */
    list?: HttpEndpointDefinition;
    /**
     * Expose the ability to download a file's contents over HTTP.
     */
    download?: HttpEndpointDefinition;
    /**
     * Expose file share functionality over HTTP.
     */
    share?: HttpEndpointDefinition;
  };
}

/**
 * A collection of generally useful metrics about files.
 */
export interface FilesMetrics {
  /**
   * Metrics about all storage media.
   */
  storage: {
    /**
     * The ES fixed size blob store.
     */
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
  /**
   * A count of all files grouped by status
   */
  countByStatus: Record<FileStatus, number>;
  /**
   * A count of all files grouped by extension
   */
  countByExtension: Record<string, number>;
}

/**
 * Set of metadata captured for every image uploaded via the file services'
 * public components.
 */
export interface FileImageMetadata {
  /**
   * The blurhash that can be displayed while the image is loading
   */
  blurhash?: string;
  /**
   * Width, in px, of the original image
   */
  width: number;
  /**
   * Height, in px, of the original image
   */
  height: number;
}
