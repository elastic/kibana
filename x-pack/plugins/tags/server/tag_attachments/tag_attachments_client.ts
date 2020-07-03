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
  TagAttachmentClientSetParams,
  TagAttachmentClientSetResult,
} from '../../common';
import {
  validateTagId,
  validateKID,
  validateTagIds,
  validatePerPage,
  validatePage,
} from '../util/validators';
import { TagsClient } from '../tags';
import { parseKID } from '../../common/kid';

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

  public async set({
    kid,
    tagIds,
  }: TagAttachmentClientSetParams): Promise<TagAttachmentClientSetResult> {
    validateKID(kid);
    validateTagIds(tagIds);

    const existingAttachments = await this.getAttachedTags({ kid });
    const attachedTags: string[] = existingAttachments.tags.map((tag) => tag.id);

    const tagsAlreadyAttached: string[] = [];
    const tagsToAttach: string[] = [];
    const tagsToDetach: string[] = [];

    for (const tag of tagIds) {
      const tagAlreadyAttached = attachedTags.indexOf(tag) > -1;
      if (!tagAlreadyAttached) tagsToAttach.push(tag);
    }

    for (const tag of attachedTags) {
      const tagPresentInNewSet = tagIds.indexOf(tag) > -1;
      if (tagPresentInNewSet) tagsAlreadyAttached.push(tag);
      else tagsToDetach.push(tag);
    }

    await Promise.all(tagsToDetach.map((tagId) => this.del({ kid, tagId })));
    const { attachments: newAttachments } = await this.create({
      attachments: tagsToAttach.map((tagId) => ({
        kid,
        tagId,
      })),
    });

    const existingAttachmentsToKeep = existingAttachments.attachments.filter(
      ({ tagId }) => tagsAlreadyAttached.indexOf(tagId) > -1
    );

    const attachments = [...existingAttachmentsToKeep, ...newAttachments];

    const { path } = parseKID(kid);
    const [, type, id] = path;

    // TODO: this will be moved out of here, instead the `tags` plugin
    // will emit "set_attachmets" event and other plugins will be able
    // to subscribe to it.
    try {
      await this.params.savedObjectsClient.update(type, id, {
        _tags: attachments.map(({ tagId }) => ({ tagId })),
      });
    } catch (error) {
      // eslint-disable-next-line
      console.error(error);
    }

    return {
      attachments,
    };
  }

  public async del({ kid, tagId }: TagAttachmentClientDeleteParams): Promise<void> {
    validateKID(kid);
    validateTagId(tagId);

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
