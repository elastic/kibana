/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface RawTag {
  enabled: boolean;
  title: string;
  description: string;
  key: string;
  value: string;
  color: '' | string;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RawTagWithId extends RawTag {
  id: string;
}

export interface TagsClientCreateParams {
  tag: Pick<RawTagWithId, 'id' | 'title' | 'description' | 'color'>;
}

export interface TagsClientCreateResult {
  tag: RawTagWithId;
}

export interface TagsClientReadParams {
  id: string;
}

export interface TagsClientReadResult {
  tag: RawTagWithId;
}

export interface TagsClientUpdateParams {
  patch: Pick<RawTagWithId, 'id' | 'title' | 'description' | 'color'>;
}

export interface TagsClientUpdateResult {
  patch: Partial<RawTag>;
}

export interface TagsClientDeleteParams {
  id: string;
}

export interface TagsClientGetAllResult {
  tags: RawTagWithId[];
}

/**
 * CRUD + List/Find API for tags.
 */
export interface ITagsClient {
  create(params: TagsClientCreateParams): Promise<TagsClientCreateResult>;
  read(params: TagsClientReadParams): Promise<TagsClientReadResult>;
  update(params: TagsClientUpdateParams): Promise<TagsClientUpdateResult>;
  del(params: TagsClientDeleteParams): Promise<void>;
  getAll(): Promise<TagsClientGetAllResult>;
}
