/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { omit } from 'lodash';

import type {
  ISavedObjectsPointInTimeFinder,
  ISavedObjectsRepository,
  SavedObject,
} from 'src/core/server';

import type {
  GetAllSpacesOptions,
  GetAllSpacesPurpose,
  GetSpaceResult,
  LegacyUrlAliasTarget,
  Space,
} from '../../common';
import { isReservedSpace } from '../../common';
import type { ConfigType } from '../config';

const SUPPORTED_GET_SPACE_PURPOSES: GetAllSpacesPurpose[] = [
  'any',
  'copySavedObjectsIntoSpace',
  'findSavedObjects',
  'shareSavedObjectsIntoSpace',
];
const DEFAULT_PURPOSE = 'any';
const LEGACY_URL_ALIAS_TYPE = 'legacy-url-alias';

/**
 * Client interface for interacting with spaces.
 */
export interface ISpacesClient {
  /**
   * Retrieve all available spaces.
   * @param options controls which spaces are retrieved.
   */
  getAll(options?: GetAllSpacesOptions): Promise<GetSpaceResult[]>;

  /**
   * Retrieve a space by its id.
   * @param id the space id.
   */
  get(id: string): Promise<Space>;

  /**
   * Creates a space.
   * @param space the space to create.
   */
  create(space: Space): Promise<Space>;

  /**
   * Updates a space.
   * @param id  the id of the space to update.
   * @param space the updated space.
   */
  update(id: string, space: Space): Promise<Space>;

  /**
   * Returns a {@link ISavedObjectsPointInTimeFinder} to help page through
   * saved objects within the specified space.
   * @param id the id of the space to search.
   */
  createSavedObjectFinder(id: string): ISavedObjectsPointInTimeFinder<unknown, unknown>;

  /**
   * Deletes a space, and all saved objects belonging to that space.
   * @param id the id of the space to delete.
   */
  delete(id: string): Promise<void>;

  /**
   * Disables the specified legacy URL aliases.
   * @param aliases the aliases to disable.
   */
  disableLegacyUrlAliases(aliases: LegacyUrlAliasTarget[]): Promise<void>;
}

/**
 * Client for interacting with spaces.
 */
export class SpacesClient implements ISpacesClient {
  constructor(
    private readonly debugLogger: (message: string) => void,
    private readonly config: ConfigType,
    private readonly repository: ISavedObjectsRepository,
    private readonly nonGlobalTypeNames: string[]
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

  public createSavedObjectFinder(id: string) {
    return this.repository.createPointInTimeFinder({
      type: this.nonGlobalTypeNames,
      namespaces: [id],
    });
  }

  public async delete(id: string) {
    const existingSavedObject = await this.repository.get('space', id);
    if (isReservedSpace(this.transformSavedObjectToSpace(existingSavedObject))) {
      throw Boom.badRequest(`The ${id} space cannot be deleted because it is reserved.`);
    }

    await this.repository.deleteByNamespace(id);

    await this.repository.delete('space', id);
  }

  public async disableLegacyUrlAliases(aliases: LegacyUrlAliasTarget[]) {
    const attributes = { disabled: true };
    const objectsToUpdate = aliases.map(({ targetSpace, targetType, sourceId }) => {
      const id = `${targetSpace}:${targetType}:${sourceId}`;
      return { type: LEGACY_URL_ALIAS_TYPE, id, attributes };
    });
    await this.repository.bulkUpdate(objectsToUpdate);
  }

  private transformSavedObjectToSpace(savedObject: SavedObject<any>) {
    return {
      id: savedObject.id,
      ...savedObject.attributes,
    } as Space;
  }
}
