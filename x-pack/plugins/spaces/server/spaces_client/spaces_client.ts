/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from '@hapi/boom';
import { omit } from 'lodash';
import { ISavedObjectsRepository, SavedObject } from 'src/core/server';
import { PublicMethodsOf } from '@kbn/utility-types';
import { Space } from 'src/plugins/spaces_oss/common';
import { GetAllSpacesOptions, GetAllSpacesPurpose, GetSpaceResult } from '../../common';
import { isReservedSpace } from '../../common';
import { ConfigType } from '../config';

const SUPPORTED_GET_SPACE_PURPOSES: GetAllSpacesPurpose[] = [
  'any',
  'copySavedObjectsIntoSpace',
  'findSavedObjects',
  'shareSavedObjectsIntoSpace',
];
const DEFAULT_PURPOSE = 'any';

export type ISpacesClient = PublicMethodsOf<SpacesClient>;

export class SpacesClient {
  constructor(
    private readonly debugLogger: (message: string) => void,
    private readonly config: ConfigType,
    private readonly repository: ISavedObjectsRepository
  ) {}

  public async getAll(options: GetAllSpacesOptions = {}): Promise<GetSpaceResult[]> {
    const { purpose = DEFAULT_PURPOSE } = options;
    if (!SUPPORTED_GET_SPACE_PURPOSES.includes(purpose)) {
      throw Boom.badRequest(`unsupported space purpose: ${purpose}`);
    }

    this.debugLogger(`SpacesClient.getAll(). querying all spaces`);

    const { saved_objects: savedObjects } = await this.repository.find({
      type: 'space',
      page: 1,
      perPage: this.config.maxSpaces,
      sortField: 'name.keyword',
    });

    this.debugLogger(`SpacesClient.getAll(). Found ${savedObjects.length} spaces.`);

    return savedObjects.map(this.transformSavedObjectToSpace);
  }

  public async get(id: string) {
    const savedObject = await this.repository.get('space', id);
    return this.transformSavedObjectToSpace(savedObject);
  }

  public async create(space: Space) {
    const { total } = await this.repository.find({
      type: 'space',
      page: 1,
      perPage: 0,
    });
    if (total >= this.config.maxSpaces) {
      throw Boom.badRequest(
        'Unable to create Space, this exceeds the maximum number of spaces set by the xpack.spaces.maxSpaces setting'
      );
    }

    this.debugLogger(`SpacesClient.create(), using RBAC. Attempting to create space`);

    const attributes = omit(space, ['id', '_reserved']);
    const id = space.id;
    const createdSavedObject = await this.repository.create('space', attributes, { id });

    this.debugLogger(`SpacesClient.create(), created space object`);

    return this.transformSavedObjectToSpace(createdSavedObject);
  }

  public async update(id: string, space: Space) {
    const attributes = omit(space, 'id', '_reserved');
    await this.repository.update('space', id, attributes);
    const updatedSavedObject = await this.repository.get('space', id);
    return this.transformSavedObjectToSpace(updatedSavedObject);
  }

  public async delete(id: string) {
    const existingSavedObject = await this.repository.get('space', id);
    if (isReservedSpace(this.transformSavedObjectToSpace(existingSavedObject))) {
      throw Boom.badRequest(`The ${id} space cannot be deleted because it is reserved.`);
    }

    await this.repository.deleteByNamespace(id);

    await this.repository.delete('space', id);
  }

  private transformSavedObjectToSpace(savedObject: SavedObject<any>) {
    return {
      id: savedObject.id,
      ...savedObject.attributes,
    } as Space;
  }
}
