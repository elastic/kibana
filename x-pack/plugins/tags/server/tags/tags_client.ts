/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  Logger,
  SavedObjectsClientContract,
  SavedObject,
  SavedObjectsBulkGetObject,
} from 'src/core/server';
import Boom from 'boom';
import { AuthenticatedUser } from '../../../security/server';
import {
  RawTag,
  RawTagWithId,
  ITagsClient,
  TagsClientCreateParams,
  TagsClientDeleteParams,
  TagsClientReadParams,
  TagsClientReadResult,
  TagsClientUpdateParams,
  TagsClientUpdateResult,
} from '../../common';
import {
  validateTagTitle,
  validateTagDescription,
  validateTagColor,
  validateTagId,
} from '../util/validators';

export type TagSavedObject = SavedObject<RawTag>;

export interface TagsClientParams {
  logger: Logger;
  savedObjectsClient: SavedObjectsClientContract;
  user: AuthenticatedUser | null | undefined;
}

export class TagsClient implements ITagsClient {
  public readonly type = 'tag';

  constructor(private readonly params: TagsClientParams) {}

  private readonly savedObjectToTag = (savedObject: TagSavedObject): RawTagWithId => {
    return {
      id: savedObject.id,
      ...savedObject.attributes,
    };
  };

  public async create({ tag }: TagsClientCreateParams): Promise<{ tag: RawTagWithId }> {
    const { title, description, color } = tag;

    validateTagTitle(title);
    validateTagDescription(description);
    validateTagColor(color);

    const { savedObjectsClient, user } = this.params;
    const at = new Date().toISOString();
    const username = user ? user.username : null;

    const rawTag: RawTag = {
      enabled: true,
      title,
      description,
      color,
      key: '',
      value: '',
      createdAt: at,
      updatedAt: at,
      createdBy: username,
      updatedBy: username,
    };
    const savedObject: TagSavedObject = await savedObjectsClient.create<RawTag>(
      this.type,
      rawTag,
      {}
    );

    return { tag: this.savedObjectToTag(savedObject) };
  }

  public async read({ id }: TagsClientReadParams): Promise<TagsClientReadResult> {
    validateTagId(id);

    const { savedObjectsClient } = this.params;
    const savedObject: TagSavedObject = await savedObjectsClient.get(this.type, id);

    return { tag: this.savedObjectToTag(savedObject) };
  }

  /**
   * Read multiple tags in once request.
   */
  public async readBulk({ ids }: { ids: string[] }): Promise<{ tags: RawTagWithId[] }> {
    const { savedObjectsClient } = this.params;
    const bulkGetObjects: SavedObjectsBulkGetObject[] = ids.map((id) => ({
      type: this.type,
      id,
    }));
    const { saved_objects } = await savedObjectsClient.bulkGet<RawTag>(bulkGetObjects);

    return { tags: saved_objects.map(this.savedObjectToTag) };
  }

  public async update({ patch }: TagsClientUpdateParams): Promise<TagsClientUpdateResult> {
    const { id, title, description, color } = patch;

    validateTagId(id);
    if (title !== undefined) validateTagTitle(title);
    if (description !== undefined) validateTagDescription(description);
    if (color !== undefined) validateTagColor(color);

    const { savedObjectsClient, user } = this.params;
    const at = new Date().toISOString();
    const username = user ? user.username : null;

    let needsUpdate = false;
    const attributePatch: Partial<RawTag> = {
      updatedAt: at,
      updatedBy: username,
    };

    if (title !== undefined) {
      needsUpdate = true;
      attributePatch.title = title;
    }

    if (description !== undefined) {
      needsUpdate = true;
      attributePatch.description = description;
    }

    if (color !== undefined) {
      needsUpdate = true;
      attributePatch.color = color;
    }

    if (!needsUpdate) throw Boom.badRequest('Empty patch, nothing to update.');

    const savedObjectUpdate = await savedObjectsClient.update<Partial<RawTag>>(
      this.type,
      id,
      attributePatch
    );

    return { patch: savedObjectUpdate.attributes };
  }

  public async del({ id }: TagsClientDeleteParams): Promise<void> {
    validateTagId(id);

    const { savedObjectsClient } = this.params;

    await savedObjectsClient.delete(this.type, id);
  }

  public async getAll(): Promise<{ tags: RawTagWithId[] }> {
    const { savedObjectsClient } = this.params;

    const result = await savedObjectsClient.find<RawTag>({
      type: this.type,
      perPage: 1000,
    });

    return {
      tags: result.saved_objects.map(this.savedObjectToTag),
    };
  }
}
