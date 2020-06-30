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

export interface Tag extends RawTag {
  id: string;
}

export interface TagsClientCreateParams {
  tag: Pick<RawTag, 'title' | 'description' | 'color'>;
}

export interface TagsClientCreateResult {
  tag: Tag;
}

export interface TagsClientGetAllResult {
  tags: Tag[];
}

export interface ITagsClient {
  create(params: TagsClientCreateParams): Promise<TagsClientCreateResult>;
  getAll(): Promise<TagsClientGetAllResult>;
}
