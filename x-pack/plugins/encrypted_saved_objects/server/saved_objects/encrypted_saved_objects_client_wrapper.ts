/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ISavedObjectTypeRegistry,
  SavedObject,
  SavedObjectsBaseOptions,
  SavedObjectsBulkCreateObject,
  SavedObjectsBulkGetObject,
  SavedObjectsBulkResolveObject,
  SavedObjectsBulkResponse,
  SavedObjectsBulkUpdateObject,
  SavedObjectsBulkUpdateResponse,
  SavedObjectsCheckConflictsObject,
  SavedObjectsClientContract,
  SavedObjectsClosePointInTimeOptions,
  SavedObjectsCollectMultiNamespaceReferencesObject,
  SavedObjectsCollectMultiNamespaceReferencesOptions,
  SavedObjectsCollectMultiNamespaceReferencesResponse,
  SavedObjectsCreateOptions,
  SavedObjectsCreatePointInTimeFinderDependencies,
  SavedObjectsCreatePointInTimeFinderOptions,
  SavedObjectsFindOptions,
  SavedObjectsFindResponse,
  SavedObjectsOpenPointInTimeOptions,
  SavedObjectsRemoveReferencesToOptions,
  SavedObjectsRemoveReferencesToResponse,
  SavedObjectsUpdateObjectsSpacesObject,
  SavedObjectsUpdateObjectsSpacesOptions,
  SavedObjectsUpdateOptions,
  SavedObjectsUpdateResponse,
} from 'src/core/server';

import { SavedObjectsUtils } from '../../../../../src/core/server';
import type { AuthenticatedUser } from '../../../security/common/model';
import type { EncryptedSavedObjectsService } from '../crypto';
import { getDescriptorNamespace } from './get_descriptor_namespace';

interface EncryptedSavedObjectsClientOptions {
  baseClient: SavedObjectsClientContract;
  baseTypeRegistry: ISavedObjectTypeRegistry;
  service: Readonly<EncryptedSavedObjectsService>;
  getCurrentUser: () => AuthenticatedUser | undefined;
}

export class EncryptedSavedObjectsClientWrapper implements SavedObjectsClientContract {
  constructor(
    private readonly options: EncryptedSavedObjectsClientOptions,
    public readonly errors = options.baseClient.errors
  ) {}

  public async checkConflicts(
    objects: SavedObjectsCheckConflictsObject[] = [],
    options?: SavedObjectsBaseOptions
  ) {
    return await this.options.baseClient.checkConflicts(objects, options);
  }

  public async create<T>(
    type: string,
    attributes: T = {} as T,
    options: SavedObjectsCreateOptions = {}
  ) {
    if (!this.options.service.isRegistered(type)) {
      return await this.options.baseClient.create(type, attributes, options);
    }

    const id = this.getValidId(options.id, options.version, options.overwrite);
    const namespace = getDescriptorNamespace(
      this.options.baseTypeRegistry,
      type,
      options.namespace
    );
    return await this.handleEncryptedAttributesInResponse(
      await this.options.baseClient.create(
        type,
        (await this.options.service.encryptAttributes(
          { type, id, namespace },
          attributes as Record<string, unknown>,
          { user: this.options.getCurrentUser() }
        )) as T,
        { ...options, id }
      ),
      attributes,
      namespace
    );
  }

  public async bulkCreate<T>(
    objects: Array<SavedObjectsBulkCreateObject<T>>,
    options?: SavedObjectsBaseOptions & Pick<SavedObjectsCreateOptions, 'overwrite'>
  ) {
    // We encrypt attributes for every object in parallel and that can potentially exhaust libuv or
    // NodeJS thread pool. If it turns out to be a problem, we can consider switching to the
    // sequential processing.
    const encryptedObjects = await Promise.all(
      objects.map(async (object) => {
        if (!this.options.service.isRegistered(object.type)) {
          return object;
        }

        const id = this.getValidId(object.id, object.version, options?.overwrite);
        const namespace = getDescriptorNamespace(
          this.options.baseTypeRegistry,
          object.type,
          options?.namespace
        );
        return {
          ...object,
          id,
          attributes: await this.options.service.encryptAttributes(
            { type: object.type, id, namespace },
            object.attributes as Record<string, unknown>,
            { user: this.options.getCurrentUser() }
          ),
        } as SavedObjectsBulkCreateObject<T>;
      })
    );

    return await this.handleEncryptedAttributesInBulkResponse(
      await this.options.baseClient.bulkCreate<T>(encryptedObjects, options),
      objects
    );
  }

  public async bulkUpdate<T>(
    objects: Array<SavedObjectsBulkUpdateObject<T>>,
    options?: SavedObjectsBaseOptions
  ) {
    // We encrypt attributes for every object in parallel and that can potentially exhaust libuv or
    // NodeJS thread pool. If it turns out to be a problem, we can consider switching to the
    // sequential processing.
    const encryptedObjects = await Promise.all(
      objects.map(async (object) => {
        const { type, id, attributes, namespace: objectNamespace } = object;
        if (!this.options.service.isRegistered(type)) {
          return object;
        }
        const namespace = getDescriptorNamespace(
          this.options.baseTypeRegistry,
          type,
          objectNamespace ?? options?.namespace
        );
        return {
          ...object,
          attributes: await this.options.service.encryptAttributes(
            { type, id, namespace },
            attributes,
            { user: this.options.getCurrentUser() }
          ),
        };
      })
    );

    return await this.handleEncryptedAttributesInBulkResponse(
      await this.options.baseClient.bulkUpdate(encryptedObjects, options),
      objects
    );
  }

  public async delete(type: string, id: string, options?: SavedObjectsBaseOptions) {
    return await this.options.baseClient.delete(type, id, options);
  }

  public async find<T, A>(options: SavedObjectsFindOptions) {
    return await this.handleEncryptedAttributesInBulkResponse(
      await this.options.baseClient.find<T, A>(options),
      undefined
    );
  }

  public async bulkGet<T>(
    objects: SavedObjectsBulkGetObject[] = [],
    options?: SavedObjectsBaseOptions
  ) {
    return await this.handleEncryptedAttributesInBulkResponse(
      await this.options.baseClient.bulkGet<T>(objects, options),
      undefined
    );
  }

  public async get<T>(type: string, id: string, options?: SavedObjectsBaseOptions) {
    return await this.handleEncryptedAttributesInResponse(
      await this.options.baseClient.get<T>(type, id, options),
      undefined as unknown,
      getDescriptorNamespace(this.options.baseTypeRegistry, type, options?.namespace)
    );
  }

  public async bulkResolve<T = unknown>(
    objects: SavedObjectsBulkResolveObject[],
    options?: SavedObjectsBaseOptions
  ) {
    const bulkResolveResult = await this.options.baseClient.bulkResolve<T>(objects, options);

    for (const resolved of bulkResolveResult.resolved_objects) {
      const savedObject = resolved.saved_object;
      await this.handleEncryptedAttributesInResponse(
        savedObject,
        undefined as unknown,
        getDescriptorNamespace(
          this.options.baseTypeRegistry,
          savedObject.type,
          savedObject.namespaces ? savedObject.namespaces[0] : undefined
        )
      );
    }

    return bulkResolveResult;
  }

  public async resolve<T>(type: string, id: string, options?: SavedObjectsBaseOptions) {
    const resolveResult = await this.options.baseClient.resolve<T>(type, id, options);
    const object = await this.handleEncryptedAttributesInResponse(
      resolveResult.saved_object,
      undefined as unknown,
      getDescriptorNamespace(this.options.baseTypeRegistry, type, options?.namespace)
    );
    return {
      ...resolveResult,
      saved_object: object,
    };
  }

  public async update<T>(
    type: string,
    id: string,
    attributes: Partial<T>,
    options?: SavedObjectsUpdateOptions<T>
  ) {
    if (!this.options.service.isRegistered(type)) {
      return await this.options.baseClient.update(type, id, attributes, options);
    }
    const namespace = getDescriptorNamespace(
      this.options.baseTypeRegistry,
      type,
      options?.namespace
    );
    return this.handleEncryptedAttributesInResponse(
      await this.options.baseClient.update(
        type,
        id,
        await this.options.service.encryptAttributes({ type, id, namespace }, attributes, {
          user: this.options.getCurrentUser(),
        }),
        options
      ),
      attributes,
      namespace
    );
  }

  public async removeReferencesTo(
    type: string,
    id: string,
    options: SavedObjectsRemoveReferencesToOptions = {}
  ): Promise<SavedObjectsRemoveReferencesToResponse> {
    return await this.options.baseClient.removeReferencesTo(type, id, options);
  }

  public async openPointInTimeForType(
    type: string | string[],
    options: SavedObjectsOpenPointInTimeOptions = {}
  ) {
    return await this.options.baseClient.openPointInTimeForType(type, options);
  }

  public async closePointInTime(id: string, options?: SavedObjectsClosePointInTimeOptions) {
    return await this.options.baseClient.closePointInTime(id, options);
  }

  public createPointInTimeFinder<T = unknown, A = unknown>(
    findOptions: SavedObjectsCreatePointInTimeFinderOptions,
    dependencies?: SavedObjectsCreatePointInTimeFinderDependencies
  ) {
    return this.options.baseClient.createPointInTimeFinder<T, A>(findOptions, {
      client: this,
      // Include dependencies last so that subsequent SO client wrappers have their settings applied.
      ...dependencies,
    });
  }

  public async collectMultiNamespaceReferences(
    objects: SavedObjectsCollectMultiNamespaceReferencesObject[],
    options?: SavedObjectsCollectMultiNamespaceReferencesOptions
  ): Promise<SavedObjectsCollectMultiNamespaceReferencesResponse> {
    return await this.options.baseClient.collectMultiNamespaceReferences(objects, options);
  }

  public async updateObjectsSpaces(
    objects: SavedObjectsUpdateObjectsSpacesObject[],
    spacesToAdd: string[],
    spacesToRemove: string[],
    options?: SavedObjectsUpdateObjectsSpacesOptions
  ) {
    return await this.options.baseClient.updateObjectsSpaces(
      objects,
      spacesToAdd,
      spacesToRemove,
      options
    );
  }

  /**
   * Strips encrypted attributes from any non-bulk Saved Objects API response. If type isn't
   * registered, response is returned as is.
   * @param response Raw response returned by the underlying base client.
   * @param [originalAttributes] Optional list of original attributes of the saved object.
   * @param [namespace] Optional namespace that was used for the saved objects operation.
   */
  private async handleEncryptedAttributesInResponse<
    T,
    R extends SavedObjectsUpdateResponse<T> | SavedObject<T>
  >(response: R, originalAttributes?: T, namespace?: string): Promise<R> {
    if (response.attributes && this.options.service.isRegistered(response.type)) {
      // Error is returned when decryption fails, and in this case encrypted attributes will be
      // stripped from the returned attributes collection. That will let consumer decide whether to
      // fail or handle recovery gracefully.
      const { attributes, error } = await this.options.service.stripOrDecryptAttributes(
        { id: response.id, type: response.type, namespace },
        response.attributes as Record<string, unknown>,
        originalAttributes as Record<string, unknown>,
        { user: this.options.getCurrentUser() }
      );

      response.attributes = attributes as T;
      if (error) {
        response.error = error as any;
      }
    }

    return response;
  }

  /**
   * Strips encrypted attributes from any bulk Saved Objects API response. If type for any bulk
   * response portion isn't registered, it is returned as is.
   * @param response Raw response returned by the underlying base client.
   * @param [objects] Optional list of saved objects with original attributes.
   */
  private async handleEncryptedAttributesInBulkResponse<
    T,
    R extends
      | SavedObjectsBulkResponse<T>
      | SavedObjectsFindResponse<T>
      | SavedObjectsBulkUpdateResponse<T>,
    O extends Array<SavedObjectsBulkCreateObject<T>> | Array<SavedObjectsBulkUpdateObject<T>>
  >(response: R, objects?: O) {
    for (const [index, savedObject] of response.saved_objects.entries()) {
      await this.handleEncryptedAttributesInResponse(
        savedObject,
        objects?.[index].attributes ?? undefined,
        getDescriptorNamespace(
          this.options.baseTypeRegistry,
          savedObject.type,
          savedObject.namespaces ? savedObject.namespaces[0] : undefined
        )
      );
    }

    return response;
  }

  // Saved objects with encrypted attributes should have IDs that are hard to guess especially
  // since IDs are part of the AAD used during encryption, that's why we control them within this
  // wrapper and don't allow consumers to specify their own IDs directly unless overwriting the original document.
  private getValidId(
    id: string | undefined,
    version: string | undefined,
    overwrite: boolean | undefined
  ) {
    if (id) {
      // only allow a specified ID if we're overwriting an existing ESO with a Version
      // this helps us ensure that the document really was previously created using ESO
      // and not being used to get around the specified ID limitation
      const canSpecifyID = (overwrite && version) || SavedObjectsUtils.isRandomId(id);
      if (!canSpecifyID) {
        throw this.errors.createBadRequestError(
          'Predefined IDs are not allowed for saved objects with encrypted attributes unless the ID is a UUID.'
        );
      }
      return id;
    }
    return SavedObjectsUtils.generateId();
  }
}
