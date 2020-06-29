/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Logger, SavedObjectsClientContract, SavedObject } from 'src/core/server';
import { AuthenticatedUser } from '../../../security/server';
import { RawTag, Tag, ITagsClient, TagsClientCreateParams } from '../../common';
import { validateTagTitle, validateTagDescription, validateTagColor } from './validators';

export type TagSavedObject = SavedObject<RawTag>;

export interface TagsClientParams {
  logger: Logger;
  savedObjectsClient: SavedObjectsClientContract;
  user: AuthenticatedUser | null;
}

export class TagsClient implements ITagsClient {
  public readonly type = 'tag';

  constructor(private readonly params: TagsClientParams) {}

  private tagSavedObjectToTag(savedObject: TagSavedObject): Tag {
    return {
      id: savedObject.id,
      ...savedObject.attributes,
    };
  }

  public async create({ tag }: TagsClientCreateParams): Promise<Tag> {
    const { savedObjectsClient, user } = this.params;
    const { title, description, color } = tag;

    validateTagTitle(title);
    validateTagDescription(description);
    validateTagColor(color);

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

    return this.tagSavedObjectToTag(savedObject);
  }
}
