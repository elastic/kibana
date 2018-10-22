/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface BaseOptions {
  namespace?: string;
}

export interface CreateOptions extends BaseOptions {
  id?: string;
  override?: boolean;
}

export interface BulkCreateObject {
  id?: string;
  type: string;
  attributes: SavedObjectAttributes;
  extraDocumentProperties?: string[];
}

export interface BulkCreateResponse {
  savedObjects: SavedObject[];
}

export interface FindOptions extends BaseOptions {
  page?: number;
  perPage?: number;
  sortField?: string;
  sortOrder?: string;
  fields?: string[];
  type?: string | string[];
}

export interface FindResponse {
  savedObjects: SavedObject[];
  total: number;
  perPage: number;
  page: number;
}

export interface UpdateOptions extends BaseOptions {
  version?: number;
}

export interface BulkGetObject {
  id: string;
  type: string;
}
export type BulkGetObjects = BulkGetObject[];

export interface BulkGetResponse {
  savedObjects: SavedObject[];
}

export interface SavedObjectAttributes {
  [key: string]: string | number | boolean | null;
}

export interface SavedObject {
  id: string;
  type: string;
  version?: number;
  updatedAt?: string;
  error?: {
    message: string;
  };
  attributes: SavedObjectAttributes;
}

export interface SavedObjectsClient {
  errors: any;
  create: (
    type: string,
    attributes: SavedObjectAttributes,
    options?: CreateOptions
  ) => Promise<SavedObject>;
  bulkCreate: (objects: BulkCreateObject[], options?: CreateOptions) => Promise<BulkCreateResponse>;
  delete: (type: string, id: string, options?: BaseOptions) => Promise<{}>;
  find: (options: FindOptions) => Promise<FindResponse>;
  bulkGet: (objects: BulkGetObjects, options?: BaseOptions) => Promise<BulkGetResponse>;
  get: (type: string, id: string, options?: BaseOptions) => Promise<SavedObject>;
  update: (
    type: string,
    id: string,
    attributes: SavedObjectAttributes,
    options?: UpdateOptions
  ) => Promise<SavedObject>;
}

export interface SOCWrapperOptions {
  client: SavedObjectsClient;
  request: any;
}

export type SOCWrapperFactory = (options: SOCWrapperOptions) => SavedObjectsClient;
