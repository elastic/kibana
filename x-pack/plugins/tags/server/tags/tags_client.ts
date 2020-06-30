/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Logger, SavedObjectsClientContract, SavedObject } from 'src/core/server';
import { AuthenticatedUser } from '../../../security/server';
import { RawTag, RawTagWithId, ITagsClient, TagsClientCreateParams } from '../../common';
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

  private readonly tagSavedObjectToTag = (savedObject: TagSavedObject): RawTagWithId => {
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

    return { tag: this.tagSavedObjectToTag(savedObject) };
  }

  public async getAll(): Promise<{ tags: RawTagWithId[] }> {
    const { savedObjectsClient } = this.params;

    const result = await savedObjectsClient.find<RawTag>({
      type: this.type,
      perPage: 1000,
    });

    return {
      tags: result.saved_objects.map(this.tagSavedObjectToTag),
    };
  }

  public async del(id: string): Promise<void> {
    validateTagId(id);

    const { savedObjectsClient } = this.params;

    await savedObjectsClient.delete(this.type, id);
  }
}
