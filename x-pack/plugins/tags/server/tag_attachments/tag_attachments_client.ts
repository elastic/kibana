/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Logger, SavedObjectsClientContract, SavedObject } from 'src/core/server';
import Boom from 'boom';
import { AuthenticatedUser } from '../../../security/server';
import {
  RawTagAttachment,
  RawTagAttachmentWithId,
  ITagAttachmentsClient,
  TagAttachmentClientCreateParams,
  TagAttachmentClientCreateResult,
  TagAttachmentClientGetResourceTagsParams,
  TagAttachmentClientGetResourceTagsResult,
  TagAttachmentClientDeleteParams,
  TagAttachmentClientFindResourcesParams,
  TagAttachmentClientFindResourcesResult,
} from '../../common';
import {
  validateTagId,
  validateKID,
  validateTagIds,
  validatePerPage,
  validatePage,
} from '../util/validators';
import { TagsClient } from '../tags';

export type TagAttachmentSavedObject = SavedObject<RawTagAttachment>;

export interface TagAttachmentsClientParams {
  logger: Logger;
  savedObjectsClient: SavedObjectsClientContract;
  user: AuthenticatedUser | null | undefined;
  tagsClient: TagsClient;
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

  private getId(tagId: string, kid: string) {
    return `${tagId}|${kid}`;
  }

  private readonly createAttachment = async ({
    tagId,
    kid,
  }: Pick<RawTagAttachment, 'tagId' | 'kid'>): Promise<RawTagAttachmentWithId> => {
    validateTagId(tagId);
    validateKID(kid);

    const { savedObjectsClient, user } = this.params;
    const at = new Date().toISOString();
    const username = user ? user.username : null;

    const id = this.getId(tagId, kid);
    const rawAttachment: RawTagAttachment = {
      tagId,
      kid,
      createdAt: at,
      createdBy: username,
    };
    const savedObject: TagAttachmentSavedObject = await savedObjectsClient.create<RawTagAttachment>(
      this.type,
      rawAttachment,
      { id }
    );

    return this.toTagAttachment(savedObject);
  };

  public async create({
    attachments,
  }: TagAttachmentClientCreateParams): Promise<TagAttachmentClientCreateResult> {
    if (!Array.isArray(attachments)) throw Boom.badRequest('Expected a list of attachments.');

    const results = await Promise.all(attachments.map(this.createAttachment));

    return { attachments: results };
  }

  public async del({ tagId, kid }: TagAttachmentClientDeleteParams): Promise<void> {
    validateTagId(tagId);
    validateKID(kid);

    const id = this.getId(tagId, kid);
    const { savedObjectsClient } = this.params;

    await savedObjectsClient.delete(this.type, id);
  }

  public async getAttachedTags({
    kid,
  }: TagAttachmentClientGetResourceTagsParams): Promise<TagAttachmentClientGetResourceTagsResult> {
    validateKID(kid);

    const { savedObjectsClient, tagsClient } = this.params;

    const { saved_objects } = await savedObjectsClient.find<RawTagAttachmentWithId>({
      type: this.type,
      search: `attributes.kid:(${kid})`,
      perPage: 100,
    });

    const ids: string[] = saved_objects.map(({ attributes }) => attributes.tagId);
    const { tags } = await tagsClient.readBulk({ ids });

    return {
      attachments: saved_objects.map(this.toTagAttachment),
      tags,
    };
  }

  public async findResources({
    tagIds,
    kidPrefix,
    perPage,
    page,
  }: TagAttachmentClientFindResourcesParams): Promise<TagAttachmentClientFindResourcesResult> {
    validateTagIds(tagIds);
    validateKID(kidPrefix);
    validatePerPage(perPage);
    validatePage(page);

    const { savedObjectsClient } = this.params;

    const { saved_objects } = await savedObjectsClient.find<RawTagAttachmentWithId>({
      type: this.type,
      search: `attributes.tagId:(${tagIds.join(' OR ')}) AND attributes.kid:(${kidPrefix}*)`,
      perPage: 100,
      page: 1,
    });

    return { attachments: saved_objects.map(this.toTagAttachment) };
  }
}
