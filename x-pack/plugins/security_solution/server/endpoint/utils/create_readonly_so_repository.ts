/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ISavedObjectsRepository, SavedObjectsServiceStart } from 'kibana/server';
import { EndpointError } from '../../../common/endpoint/errors';

type ISavedObjectsRepositoryKeys = keyof ISavedObjectsRepository;

const RESTRICTED_METHODS: readonly ISavedObjectsRepositoryKeys[] = [
  'bulkCreate',
  'bulkUpdate',
  'create',
  'createPointInTimeFinder',
  'delete',
  'removeReferencesTo',
  'openPointInTimeForType',
  'closePointInTime',
  'update',
  'updateObjectsSpaces',
];

export class ReadonlySoRepositoryMethodNotAllowedError extends EndpointError {}

/**
 * Creates an internal saved objects repository that can only perform READ
 * operations.
 */
export const createReadonlySoRepository = (
  savedObjectsServiceStart: SavedObjectsServiceStart
): ISavedObjectsRepository => {
  const soRepo = savedObjectsServiceStart.createInternalRepository();

  return new Proxy(soRepo, {
    get(
      target: ISavedObjectsRepository,
      methodName: ISavedObjectsRepositoryKeys,
      receiver: unknown
    ): unknown {
      if (RESTRICTED_METHODS.includes(methodName)) {
        throw new ReadonlySoRepositoryMethodNotAllowedError(
          `Method [${methodName}] not allowed on readonly SO Repo`
        );
      }

      return Reflect.get(target, methodName, receiver);
    },
  }) as ISavedObjectsRepository;
};
