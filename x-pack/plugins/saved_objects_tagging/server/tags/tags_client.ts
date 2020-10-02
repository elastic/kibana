/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClientContract, SavedObject } from 'src/core/server';
import { Tag, TagAttributes, ITagsClient } from '../../common/types';
import { tagSavedObjectTypeName } from '../../common/constants';

type TagSavedObject = SavedObject<TagAttributes>;

interface TagsClientOptions {
  client: SavedObjectsClientContract;
}

const savedObjectToTag = (savedObject: TagSavedObject): Tag => {
  return {
    id: savedObject.id,
    ...savedObject.attributes,
  };
};

export class TagsClient implements ITagsClient {
  private readonly client: SavedObjectsClientContract;
  private readonly type = tagSavedObjectTypeName;

  constructor({ client }: TagsClientOptions) {
    this.client = client;
  }

  public async create(attributes: TagAttributes) {
    // TODO: validation (title+color)
    const raw = await this.client.create<TagAttributes>(this.type, attributes);
    return savedObjectToTag(raw);
  }

  public async update(id: string, attributes: TagAttributes) {
    // TODO: validation (title+color)
    const raw = await this.client.update<TagAttributes>(this.type, id, attributes);
    return savedObjectToTag(raw as TagSavedObject); // all attributes are updated, this is not a partial
  }

  public async get(id: string) {
    const raw = await this.client.get<TagAttributes>(this.type, id);
    return savedObjectToTag(raw);
  }

  public async getAll() {
    const result = await this.client.find<TagAttributes>({
      type: this.type,
      perPage: 1000,
    });

    return result.saved_objects.map(savedObjectToTag);
  }

  public async delete(id: string) {
    // TODO: remove references from objects referencing the tag.
    //       We will need the internal client for that.
    await this.client.delete(this.type, id);
  }
}
