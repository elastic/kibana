/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';

import type {
  ISavedObjectTypeRegistry,
  SavedObject,
  SavedObjectsBaseOptions,
  SavedObjectsBulkCreateObject,
  SavedObjectsBulkGetObject,
  SavedObjectsBulkResolveObject,
  SavedObjectsBulkUpdateObject,
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
  SavedObjectsOpenPointInTimeOptions,
  SavedObjectsRemoveReferencesToOptions,
  SavedObjectsUpdateObjectsSpacesObject,
  SavedObjectsUpdateObjectsSpacesOptions,
  SavedObjectsUpdateOptions,
} from '@kbn/core/server';
import { SavedObjectsErrorHelpers, SavedObjectsUtils } from '@kbn/core/server';

import { ALL_SPACES_ID } from '../../common/constants';
import { spaceIdToNamespace } from '../lib/utils/namespace';
import type { ISpacesClient } from '../spaces_client';
import type { SpacesServiceStart } from '../spaces_service/spaces_service';

interface Left<L> {
  tag: 'Left';
  value: L;
}

interface Right<R> {
  tag: 'Right';
  value: R;
}

type Either<L = unknown, R = L> = Left<L> | Right<R>;
const isLeft = <L, R>(either: Either<L, R>): either is Left<L> => either.tag === 'Left';

interface SpacesSavedObjectsClientOptions {
  baseClient: SavedObjectsClientContract;
  request: any;
  getSpacesService: () => SpacesServiceStart;
  typeRegistry: ISavedObjectTypeRegistry;
}

const coerceToArray = (param: string | string[]) => {
  if (Array.isArray(param)) {
    return param;
  }

  return [param];
};

const throwErrorIfNamespaceSpecified = (options: any) => {
  if (options.namespace) {
    throw new Error('Spaces currently determines the namespaces');
  }
};

export class SpacesSavedObjectsClient implements SavedObjectsClientContract {
  private readonly client: SavedObjectsClientContract;
  private readonly typeRegistry: ISavedObjectTypeRegistry;
  private readonly spaceId: string;
  private readonly types: string[];
  private readonly spacesClient: ISpacesClient;
  public readonly errors: SavedObjectsClientContract['errors'];

  constructor(options: SpacesSavedObjectsClientOptions) {
    const { baseClient, request, getSpacesService, typeRegistry } = options;

    const spacesService = getSpacesService();

    this.client = baseClient;
    this.typeRegistry = typeRegistry;
    this.spacesClient = spacesService.createSpacesClient(request);
    this.spaceId = spacesService.getSpaceId(request);
    this.types = typeRegistry.getAllTypes().map((t) => t.name);
    this.errors = baseClient.errors;
  }

  async checkConflicts(
    objects: SavedObjectsCheckConflictsObject[] = [],
    options: SavedObjectsBaseOptions = {}
  ) {
    throwErrorIfNamespaceSpecified(options);

    return await this.client.checkConflicts(objects, {
      ...options,
      namespace: spaceIdToNamespace(this.spaceId),
    });
  }

  async create<T = unknown>(
    type: string,
    attributes: T = {} as T,
    options: SavedObjectsCreateOptions = {}
  ) {
    throwErrorIfNamespaceSpecified(options);

    return await this.client.create<T>(type, attributes, {
      ...options,
      namespace: spaceIdToNamespace(this.spaceId),
    });
  }

  async bulkCreate<T = unknown>(
    objects: Array<SavedObjectsBulkCreateObject<T>>,
    options: SavedObjectsBaseOptions = {}
  ) {
    throwErrorIfNamespaceSpecified(options);

    return await this.client.bulkCreate(objects, {
      ...options,
      namespace: spaceIdToNamespace(this.spaceId),
    });
  }

  async delete(type: string, id: string, options: SavedObjectsBaseOptions = {}) {
    throwErrorIfNamespaceSpecified(options);

    return await this.client.delete(type, id, {
      ...options,
      namespace: spaceIdToNamespace(this.spaceId),
    });
  }

  async find<T = unknown, A = unknown>(options: SavedObjectsFindOptions) {
    let namespaces: string[];
    try {
      namespaces = await this.getSearchableSpaces(options.namespaces);
    } catch (err) {
      if (Boom.isBoom(err) && err.output.payload.statusCode === 403) {
        // return empty response, since the user is unauthorized in any space, but we don't return forbidden errors for `find` operations
        return SavedObjectsUtils.createEmptyFindResponse<T, A>(options);
      }
      throw err;
    }
    if (namespaces.length === 0) {
      // return empty response, since the user is unauthorized in this space (or these spaces), but we don't return forbidden errors for `find` operations
      return SavedObjectsUtils.createEmptyFindResponse<T, A>(options);
    }

    return await this.client.find<T, A>({
      ...options,
      type: (options.type ? coerceToArray(options.type) : this.types).filter(
        (type) => type !== 'space'
      ),
      namespaces,
    });
  }

  async bulkGet<T = unknown>(
    objects: SavedObjectsBulkGetObject[] = [],
    options: SavedObjectsBaseOptions = {}
  ) {
    throwErrorIfNamespaceSpecified(options);

    let availableSpacesPromise: Promise<string[]> | undefined;
    const getAvailableSpaces = async () => {
      if (!availableSpacesPromise) {
        availableSpacesPromise = this.getSearchableSpaces([ALL_SPACES_ID]).catch((err) => {
          if (Boom.isBoom(err) && err.output.payload.statusCode === 403) {
            return []; // the user doesn't have access to any spaces
          } else {
            throw err;
          }
        });
      }
      return availableSpacesPromise;
    };

    const expectedResults = await Promise.all(
      objects.map<Promise<Either<SavedObjectsBulkGetObject>>>(async (object) => {
        const { namespaces, type } = object;
        if (namespaces?.includes(ALL_SPACES_ID)) {
          // If searching for an isolated object in all spaces, we may need to return a 400 error for consistency with the validation at the
          // repository level. This is needed if there is only one space available *and* the user is authorized to access the object in that
          // space; in that case, we don't want to unintentionally bypass the repository's validation by deconstructing the '*' identifier
          // into all available spaces.
          const tag =
            !this.typeRegistry.isNamespaceAgnostic(type) && !this.typeRegistry.isShareable(type)
              ? 'Left'
              : 'Right';
          return { tag, value: { ...object, namespaces: await getAvailableSpaces() } };
        }
        return { tag: 'Right', value: object };
      })
    );

    const objectsToGet = expectedResults.map(({ value }) => value);
    const { saved_objects: responseObjects } = objectsToGet.length
      ? await this.client.bulkGet<T>(objectsToGet, {
          ...options,
          namespace: spaceIdToNamespace(this.spaceId),
        })
      : { saved_objects: [] };
    return {
      saved_objects: expectedResults.map((expectedResult, i) => {
        const actualResult = responseObjects[i];
        if (isLeft(expectedResult)) {
          const { type, id } = expectedResult.value;
          return {
            type,
            id,
            error: SavedObjectsErrorHelpers.createBadRequestError(
              '"namespaces" can only specify a single space when used with space-isolated types'
            ).output.payload,
          } as unknown as SavedObject<T>;
        }
        return actualResult;
      }),
    };
  }

  async get<T = unknown>(type: string, id: string, options: SavedObjectsBaseOptions = {}) {
    throwErrorIfNamespaceSpecified(options);

    return await this.client.get<T>(type, id, {
      ...options,
      namespace: spaceIdToNamespace(this.spaceId),
    });
  }

  async bulkResolve<T = unknown>(
    objects: SavedObjectsBulkResolveObject[],
    options: SavedObjectsBaseOptions = {}
  ) {
    throwErrorIfNamespaceSpecified(options);

    return await this.client.bulkResolve<T>(objects, {
      ...options,
      namespace: spaceIdToNamespace(this.spaceId),
    });
  }

  async resolve<T = unknown>(type: string, id: string, options: SavedObjectsBaseOptions = {}) {
    throwErrorIfNamespaceSpecified(options);

    return await this.client.resolve<T>(type, id, {
      ...options,
      namespace: spaceIdToNamespace(this.spaceId),
    });
  }

  async update<T = unknown>(
    type: string,
    id: string,
    attributes: Partial<T>,
    options: SavedObjectsUpdateOptions = {}
  ) {
    throwErrorIfNamespaceSpecified(options);

    return await this.client.update(type, id, attributes, {
      ...options,
      namespace: spaceIdToNamespace(this.spaceId),
    });
  }

  async bulkUpdate<T = unknown>(
    objects: Array<SavedObjectsBulkUpdateObject<T>> = [],
    options: SavedObjectsBaseOptions = {}
  ) {
    throwErrorIfNamespaceSpecified(options);
    return await this.client.bulkUpdate(objects, {
      ...options,
      namespace: spaceIdToNamespace(this.spaceId),
    });
  }

  async removeReferencesTo(
    type: string,
    id: string,
    options: SavedObjectsRemoveReferencesToOptions = {}
  ) {
    throwErrorIfNamespaceSpecified(options);
    return await this.client.removeReferencesTo(type, id, {
      ...options,
      namespace: spaceIdToNamespace(this.spaceId),
    });
  }

  async collectMultiNamespaceReferences(
    objects: SavedObjectsCollectMultiNamespaceReferencesObject[],
    options: SavedObjectsCollectMultiNamespaceReferencesOptions = {}
  ): Promise<SavedObjectsCollectMultiNamespaceReferencesResponse> {
    throwErrorIfNamespaceSpecified(options);
    return await this.client.collectMultiNamespaceReferences(objects, {
      ...options,
      namespace: spaceIdToNamespace(this.spaceId),
    });
  }

  async updateObjectsSpaces(
    objects: SavedObjectsUpdateObjectsSpacesObject[],
    spacesToAdd: string[],
    spacesToRemove: string[],
    options: SavedObjectsUpdateObjectsSpacesOptions = {}
  ) {
    throwErrorIfNamespaceSpecified(options);
    return await this.client.updateObjectsSpaces(objects, spacesToAdd, spacesToRemove, {
      ...options,
      namespace: spaceIdToNamespace(this.spaceId),
    });
  }

  async openPointInTimeForType(
    type: string | string[],
    options: SavedObjectsOpenPointInTimeOptions = {}
  ) {
    let namespaces: string[];
    try {
      namespaces = await this.getSearchableSpaces(options.namespaces);
    } catch (err) {
      if (Boom.isBoom(err) && err.output.payload.statusCode === 403) {
        // throw bad request since the user is unauthorized in any space
        throw SavedObjectsErrorHelpers.createBadRequestError();
      }
      throw err;
    }
    if (namespaces.length === 0) {
      // throw bad request if no valid spaces were found.
      throw SavedObjectsErrorHelpers.createBadRequestError();
    }

    return await this.client.openPointInTimeForType(type, {
      ...options,
      namespaces,
    });
  }

  async closePointInTime(id: string, options: SavedObjectsClosePointInTimeOptions = {}) {
    throwErrorIfNamespaceSpecified(options);
    return await this.client.closePointInTime(id, {
      ...options,
      namespace: spaceIdToNamespace(this.spaceId),
    });
  }

  createPointInTimeFinder<T = unknown, A = unknown>(
    findOptions: SavedObjectsCreatePointInTimeFinderOptions,
    dependencies?: SavedObjectsCreatePointInTimeFinderDependencies
  ) {
    throwErrorIfNamespaceSpecified(findOptions);
    // We don't need to handle namespaces here, because `createPointInTimeFinder`
    // is simply a helper that calls `find`, `openPointInTimeForType`, and
    // `closePointInTime` internally, so namespaces will already be handled
    // in those methods.
    return this.client.createPointInTimeFinder<T, A>(findOptions, {
      client: this,
      // Include dependencies last so that subsequent SO client wrappers have their settings applied.
      ...dependencies,
    });
  }

  private async getSearchableSpaces(namespaces?: string[]): Promise<string[]> {
    if (namespaces) {
      const availableSpaces = await this.spacesClient.getAll({ purpose: 'findSavedObjects' });
      if (namespaces.includes(ALL_SPACES_ID)) {
        return availableSpaces.map((space) => space.id);
      } else {
        return namespaces.filter((namespace) =>
          availableSpaces.some((space) => space.id === namespace)
        );
      }
    } else {
      return [this.spaceId];
    }
  }
}
