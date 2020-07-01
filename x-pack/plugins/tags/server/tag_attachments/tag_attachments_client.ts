/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Logger, SavedObjectsClientContract, SavedObject } from 'src/core/server';
import { AuthenticatedUser } from '../../../security/server';
import {
  RawTagAttachment,
  RawTagAttachmentWithId,
  ITagAttachmentsClient,
  TagAttachmentClientCreateParams,
  TagAttachmentClientCreateResult,
} from '../../common';
import { validateTagId, validateKID } from '../util/validators';

export type TagAttachmentSavedObject = SavedObject<RawTagAttachment>;

export interface TagAttachmentsClientParams {
  logger: Logger;
  savedObjectsClient: SavedObjectsClientContract;
  user: AuthenticatedUser | null | undefined;
}

export class TagAttachmentsClient implements ITagAttachmentsClient {
  public readonly type = 'tag_attachment';

  constructor(private readonly params: TagAttachmentsClientParams) {}

  private readonly toTagAttachment = (
    savedObject: TagAttachmentSavedObject
  ): RawTagAttachmentWithId => {
    return {
      id: savedObject.id,
      ...savedObject.attributes,
    };
  };

  public async create({
    attachment,
  }: TagAttachmentClientCreateParams): Promise<TagAttachmentClientCreateResult> {
    const { tagId, kid } = attachment;

    validateTagId(tagId);
    validateKID(kid);

    const { savedObjectsClient, user } = this.params;
    const at = new Date().toISOString();
    const username = user ? user.username : null;

    const rawAttachment: RawTagAttachment = {
      tagId,
      kid,
      createdAt: at,
      createdBy: username,
    };
    const savedObject: TagAttachmentSavedObject = await savedObjectsClient.create<RawTagAttachment>(
      this.type,
      rawAttachment,
      {}
    );

    return { attachment: this.toTagAttachment(savedObject) };
  }
}
