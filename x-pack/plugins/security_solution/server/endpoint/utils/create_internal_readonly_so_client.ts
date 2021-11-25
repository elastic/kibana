/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest, SavedObjectsClientContract, SavedObjectsServiceStart } from 'kibana/server';
import { EndpointError } from '../../../common/endpoint/errors';

type SavedObjectsClientContractKeys = keyof SavedObjectsClientContract;

const RESTRICTED_METHODS: readonly SavedObjectsClientContractKeys[] = [
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

export class InternalReadonlySoClientMethodNotAllowedError extends EndpointError {}

/**
 * Creates an internal (system user) Saved Objects client (permissions turned off) that can only perform READ
 * operations.
 */
export const createInternalReadonlySoClient = (
  savedObjectsServiceStart: SavedObjectsServiceStart
): SavedObjectsClientContract => {
  const fakeRequest = {
    headers: {},
    getBasePath: () => '',
    path: '/',
    route: { settings: {} },
    url: { href: {} },
    raw: { req: { url: '/' } },
  } as unknown as KibanaRequest;

  const internalSoClient = savedObjectsServiceStart.getScopedClient(fakeRequest, {
    excludedWrappers: ['security'],
  });

  return new Proxy(internalSoClient, {
    get(
      target: SavedObjectsClientContract,
      methodName: SavedObjectsClientContractKeys,
      receiver: unknown
    ): unknown {
      if (RESTRICTED_METHODS.includes(methodName)) {
        throw new InternalReadonlySoClientMethodNotAllowedError(
          `Method [${methodName}] not allowed on internal readonly SO Client`
        );
      }

      return Reflect.get(target, methodName, receiver);
    },
  }) as SavedObjectsClientContract;
};
