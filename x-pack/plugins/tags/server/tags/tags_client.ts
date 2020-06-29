/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Logger, SavedObjectsClientContract, SavedObject } from 'src/core/server';
import { AuthenticatedUser } from '../../../security/server';
import { RawTag } from '../../common';
import { validateTagTitle, validateTagDescription, validateTagColor } from './validators';

export type TagSavedObject = SavedObject<RawTag>;

export interface TagsClientParams {
  logger: Logger;
  savedObjectsClient: SavedObjectsClientContract;
  user: AuthenticatedUser | null;
}

export interface TagsClientCreateParams {
  tag: Pick<RawTag, 'title' | 'description' | 'color'>;
}

export class TagsClient {
  public readonly type = 'tag';

  constructor(private readonly params: TagsClientParams) {}

  public async create({ tag }: TagsClientCreateParams): Promise<TagSavedObject> {
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
    const createdTag: TagSavedObject = await savedObjectsClient.create<RawTag>(
      this.type,
      rawTag,
      {}
    );

    return createdTag;
  }
}
