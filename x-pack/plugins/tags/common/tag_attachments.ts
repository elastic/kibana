/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

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
  attachment: Pick<RawTagAttachment, 'tagId' | 'kid'>;
}

export interface TagAttachmentClientCreateResult {
  attachment: RawTagAttachmentWithId;
}

export interface ITagAttachmentsClient {
  create(params: TagAttachmentClientCreateParams): Promise<TagAttachmentClientCreateResult>;
}
