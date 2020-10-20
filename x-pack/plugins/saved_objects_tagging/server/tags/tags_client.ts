/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClientContract, SavedObject } from 'src/core/server';
import { Tag, TagAttributes, ITagsClient } from '../../common/types';
import { tagSavedObjectTypeName } from '../../common/constants';
import { TagValidationError } from './errors';
import { validateTag } from './validate_tag';

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
  private readonly soClient: SavedObjectsClientContract;
  private readonly type = tagSavedObjectTypeName;

  constructor({ client }: TagsClientOptions) {
    this.soClient = client;
  }

  public async create(attributes: TagAttributes) {
    const validation = validateTag(attributes);
    if (!validation.valid) {
      throw new TagValidationError('Error validating tag attributes', validation);
    }
    const raw = await this.soClient.create<TagAttributes>(this.type, attributes);
    return savedObjectToTag(raw);
  }

  public async update(id: string, attributes: TagAttributes) {
    const validation = validateTag(attributes);
    if (!validation.valid) {
      throw new TagValidationError('Error validating tag attributes', validation);
    }
    const raw = await this.soClient.update<TagAttributes>(this.type, id, attributes);
    return savedObjectToTag(raw as TagSavedObject); // all attributes are updated, this is not a partial
  }

  public async get(id: string) {
    const raw = await this.soClient.get<TagAttributes>(this.type, id);
    return savedObjectToTag(raw);
  }

  public async getAll() {
    const result = await this.soClient.find<TagAttributes>({
      type: this.type,
      perPage: 10000,
    });

    return result.saved_objects.map(savedObjectToTag);
  }

  public async delete(id: string) {
    await this.soClient.delete(this.type, id);
    // `removeReferencesTo` security check is the same as a `delete` operation's, so we can use the scoped client here.
    // If that was to change, we would need to use the internal client instead. A FTR test is ensuring
    // that this behave properly even with only 'tag' SO type write permission.
    await this.soClient.removeReferencesTo(this.type, id);
  }
}
