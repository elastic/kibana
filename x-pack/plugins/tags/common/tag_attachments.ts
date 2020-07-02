/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RawTagWithId } from './tags';

/**
 * Represents a tag attachemnt to KID (Kibana ID) as stored in
 * Saved Object client.
 */
export interface RawTagAttachment {
  tagId: string;
  kid: string;
  createdBy: string | null;
  createdAt: string;
}

/** Tag attachment together with saved object ID. */
export interface RawTagAttachmentWithId extends RawTagAttachment {
  id: string;
}

export interface TagAttachmentClientCreateParams {
  attachments: Array<Pick<RawTagAttachment, 'tagId' | 'kid'>>;
}

export interface TagAttachmentClientCreateResult {
  attachments: RawTagAttachmentWithId[];
}

export interface TagAttachmentClientDeleteParams {
  tagId: string;
  kid: string;
}

export interface TagAttachmentClientGetResourceTagsParams {
  kid: string;
}

export interface TagAttachmentClientGetResourceTagsResult {
  attachments: RawTagAttachmentWithId[];
  tags: RawTagWithId[];
}

export interface TagAttachmentClientFindResourcesParams {
  tagIds: string[];
  kidPrefix: string;
  perPage?: number;
  page?: number;
}

export interface TagAttachmentClientFindResourcesResult {
  attachments: RawTagAttachmentWithId[];
}

/**
 * CRUD + List/Find API for tag attachments.
 */
export interface ITagAttachmentsClient {
  create(params: TagAttachmentClientCreateParams): Promise<TagAttachmentClientCreateResult>;
  del(params: TagAttachmentClientDeleteParams): Promise<void>;
  getAttachedTags(
    params: TagAttachmentClientGetResourceTagsParams
  ): Promise<TagAttachmentClientGetResourceTagsResult>;
  findResources(
    params: TagAttachmentClientFindResourcesParams
  ): Promise<TagAttachmentClientFindResourcesResult>;
}
