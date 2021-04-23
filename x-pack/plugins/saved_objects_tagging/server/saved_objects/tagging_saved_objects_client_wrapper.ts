/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SavedObjectsAddToNamespacesOptions,
  SavedObjectsBaseOptions,
  SavedObjectsBulkCreateObject,
  SavedObjectsBulkGetObject,
  SavedObjectsBulkUpdateObject,
  SavedObjectsBulkUpdateOptions,
  SavedObjectsCheckConflictsObject,
  SavedObjectsClientContract,
  SavedObjectsCollectMultiNamespaceReferencesObject,
  SavedObjectsCollectMultiNamespaceReferencesOptions,
  SavedObjectsCreateOptions,
  SavedObjectsCreatePointInTimeFinderDependencies,
  SavedObjectsCreatePointInTimeFinderOptions,
  SavedObjectsDeleteFromNamespacesOptions,
  SavedObjectsDeleteOptions,
  SavedObjectsFindOptions,
  SavedObjectsOpenPointInTimeOptions,
  SavedObjectsRemoveReferencesToOptions,
  SavedObjectsUpdateObjectsSpacesObject,
  SavedObjectsUpdateObjectsSpacesOptions,
  SavedObjectsUpdateOptions,
} from 'src/core/server';
import { tagSavedObjectTypeName } from '../../common';

interface TaggingSavedObjectsClientWrapperOptions {
  baseClient: SavedObjectsClientContract;
}

export class TaggingSavedObjectsClientWrapper implements SavedObjectsClientContract {
  constructor(
    private readonly options: TaggingSavedObjectsClientWrapperOptions,
    public readonly errors = options.baseClient.errors
  ) {}

  async create<T = unknown>(type: string, attributes: T, options?: SavedObjectsCreateOptions) {
    return await this.options.baseClient.create<T>(type, attributes, options);
  }

  async bulkCreate<T = unknown>(
    objects: Array<SavedObjectsBulkCreateObject<T>>,
    options?: SavedObjectsCreateOptions
  ) {
    return this.options.baseClient.bulkCreate<T>(objects, options);
  }

  async checkConflicts(
    objects?: SavedObjectsCheckConflictsObject[],
    options?: SavedObjectsBaseOptions
  ) {
    return this.options.baseClient.checkConflicts(objects, options);
  }

  async delete(type: string, id: string, options?: SavedObjectsDeleteOptions) {
    return this.options.baseClient.delete(type, id, options);
  }

  async find<T = unknown, A = unknown>(options: SavedObjectsFindOptions) {
    return this.options.baseClient.find<T, A>(options);
  }

  async bulkGet<T = unknown>(
    objects?: SavedObjectsBulkGetObject[],
    options?: SavedObjectsBaseOptions
  ) {
    return this.options.baseClient.bulkGet<T>(objects, options);
  }

  async get<T = unknown>(type: string, id: string, options?: SavedObjectsBaseOptions) {
    return this.options.baseClient.get<T>(type, id, options);
  }

  async resolve<T = unknown>(type: string, id: string, options?: SavedObjectsBaseOptions) {
    return this.options.baseClient.resolve<T>(type, id, options);
  }

  async update<T = unknown>(
    type: string,
    id: string,
    attributes: Partial<T>,
    options?: SavedObjectsUpdateOptions
  ) {
    return this.options.baseClient.update<T>(type, id, attributes, options);
  }

  async addToNamespaces(
    type: string,
    id: string,
    namespaces: string[],
    options?: SavedObjectsAddToNamespacesOptions
  ) {
    return this.options.baseClient.addToNamespaces(type, id, namespaces, options);
  }

  async deleteFromNamespaces(
    type: string,
    id: string,
    namespaces: string[],
    options?: SavedObjectsDeleteFromNamespacesOptions
  ) {
    return this.options.baseClient.deleteFromNamespaces(type, id, namespaces, options);
  }

  async bulkUpdate<T = unknown>(
    objects: Array<SavedObjectsBulkUpdateObject<T>>,
    options?: SavedObjectsBulkUpdateOptions
  ) {
    return this.options.baseClient.bulkUpdate<T>(objects, options);
  }

  async removeReferencesTo(
    type: string,
    id: string,
    options?: SavedObjectsRemoveReferencesToOptions
  ) {
    return this.options.baseClient.removeReferencesTo(type, id, options);
  }

  async openPointInTimeForType(
    type: string | string[],
    options?: SavedObjectsOpenPointInTimeOptions
  ) {
    return this.options.baseClient.openPointInTimeForType(type, options);
  }

  async closePointInTime(id: string, options?: SavedObjectsBaseOptions) {
    return this.options.baseClient.closePointInTime(id, options);
  }

  createPointInTimeFinder<T = unknown, A = unknown>(
    findOptions: SavedObjectsCreatePointInTimeFinderOptions,
    dependencies?: SavedObjectsCreatePointInTimeFinderDependencies
  ) {
    return this.options.baseClient.createPointInTimeFinder<T, A>(findOptions, dependencies);
  }

  async collectMultiNamespaceReferences(
    objects: SavedObjectsCollectMultiNamespaceReferencesObject[],
    options: SavedObjectsCollectMultiNamespaceReferencesOptions = {}
  ) {
    const { excludeTags } = options;
    const typesToExclude = [
      ...(options.typesToExclude ?? []),
      ...(excludeTags ? [tagSavedObjectTypeName] : []),
    ];
    const newOptions = { ...options, ...(typesToExclude.length && { typesToExclude }) };
    return this.options.baseClient.collectMultiNamespaceReferences(objects, newOptions);
  }

  async updateObjectsSpaces(
    objects: SavedObjectsUpdateObjectsSpacesObject[],
    spacesToAdd: string[],
    spacesToRemove: string[],
    options?: SavedObjectsUpdateObjectsSpacesOptions
  ) {
    return this.options.baseClient.updateObjectsSpaces(
      objects,
      spacesToAdd,
      spacesToRemove,
      options
    );
  }
}
