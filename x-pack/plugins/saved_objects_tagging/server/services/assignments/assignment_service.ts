/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { uniq } from 'lodash';
import { PublicMethodsOf } from '@kbn/utility-types';
import {
  SavedObjectsClientContract,
  ISavedObjectTypeRegistry,
  SavedObject,
  SavedObjectsType,
  KibanaRequest,
} from 'src/core/server';
import { SecurityPluginSetup } from '../../../../security/server';
import {
  AssignableObject,
  UpdateTagAssignmentsOptions,
  FindAssignableObjectOptions,
  getKey,
} from '../../../common/assignments';
import { updateTagReferences } from '../../../common/references';
import { tagSavedObjectTypeName } from '../../../common';
import { taggableTypes } from '../../../common/constants';
import { getUpdatableSavedObjectTypes } from './get_updatable_types';

interface AssignmentServiceOptions {
  request: KibanaRequest;
  client: SavedObjectsClientContract;
  typeRegistry: ISavedObjectTypeRegistry;
  authorization?: SecurityPluginSetup['authz'];
}

// TODO: rename to scoped

export type IAssignmentService = PublicMethodsOf<AssignmentService>;

export class AssignmentService {
  private readonly soClient: SavedObjectsClientContract;
  private readonly typeRegistry: ISavedObjectTypeRegistry;
  private readonly authorization?: SecurityPluginSetup['authz'];
  private readonly request: KibanaRequest;

  constructor({ client, typeRegistry, authorization, request }: AssignmentServiceOptions) {
    this.soClient = client;
    this.typeRegistry = typeRegistry;
    this.authorization = authorization;
    this.request = request;
  }

  public async findAssignableObjects({
    search,
    types,
    maxResults = 100,
  }: FindAssignableObjectOptions): Promise<AssignableObject[]> {
    const searchedTypes = types
      ? types.filter((type) => taggableTypes.includes(type))
      : taggableTypes;
    const updatableTypes = await getUpdatableSavedObjectTypes({
      request: this.request,
      types: searchedTypes,
      authorization: this.authorization,
    });
    const searchFields = uniq(
      updatableTypes.map((name) => this.typeRegistry.getType(name)?.management!.defaultSearchField!)
    );

    const findResponse = await this.soClient.find({
      page: 1,
      perPage: maxResults,
      search,
      type: updatableTypes,
      searchFields,
    });

    return findResponse.saved_objects.map((object) =>
      toAssignableObject(object, this.typeRegistry.getType(object.type)!)
    );
  }

  public async updateTagAssignments({ tags, assign, unassign }: UpdateTagAssignmentsOptions) {
    const { saved_objects: objects } = await this.soClient.bulkGet([...assign, ...unassign]);

    // TODO: filter types based on taggable status
    // TODO: filter types based on user permissions

    const toAssign = new Set(assign.map(getKey));
    const toUnassign = new Set(unassign.map(getKey));

    const updatedObjects = objects.map((object) => {
      return {
        id: object.id,
        type: object.type,
        // partial update. this will not update any attribute
        attributes: {},
        references: updateTagReferences({
          references: object.references,
          toAdd: toAssign.has(getKey(object)) ? tags : [],
          toRemove: toUnassign.has(getKey(object)) ? tags : [],
        }),
      };
    });

    await this.soClient.bulkUpdate(updatedObjects);
  }
}

// TODO: move to util + test
const toAssignableObject = (object: SavedObject, typeDef: SavedObjectsType): AssignableObject => {
  return {
    id: object.id,
    type: object.type,
    title: typeDef.management?.getTitle ? typeDef.management.getTitle(object) : object.id,
    icon: typeDef.management?.icon,
    tags: object.references
      .filter(({ type }) => type === tagSavedObjectTypeName)
      .map(({ id }) => id),
  };
};
