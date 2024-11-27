/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/no-explicit-any,max-classes-per-file */

import type { SavedObjectsServiceStart } from '@kbn/core-saved-objects-server';
import { SECURITY_EXTENSION_ID, SPACES_EXTENSION_ID } from '@kbn/core-saved-objects-server';
import type { HttpServiceSetup, KibanaRequest } from '@kbn/core-http-server';
import { kibanaRequestFactory } from '@kbn/core-http-server-utils';
import { DEFAULT_SPACE_ID, addSpaceIdToPath } from '@kbn/spaces-plugin/common';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { EndpointError } from '../../../../common/endpoint/errors';

type SavedObjectsClientContractKeys = keyof SavedObjectsClientContract;

const RESTRICTED_METHODS: readonly SavedObjectsClientContractKeys[] = [
  'bulkCreate',
  'bulkUpdate',
  'create',
  'createPointInTimeFinder',
  'delete',
  'removeReferencesTo',
  'update',
  'updateObjectsSpaces',
];

export class InternalReadonlySoClientMethodNotAllowedError extends EndpointError {}

/**
 * Factory service for accessing saved object clients
 */
export class SavedObjectsClientFactory {
  constructor(
    private readonly savedObjectsServiceStart: SavedObjectsServiceStart,
    private readonly httpServiceSetup: HttpServiceSetup
  ) {}

  protected createFakeHttpRequest(spaceId: string = DEFAULT_SPACE_ID): KibanaRequest {
    const fakeRequest = kibanaRequestFactory({
      headers: {},
      path: '/',
      route: { settings: {} },
      url: { href: {}, hash: '' } as URL,
      raw: { req: { url: '/' } } as any,
    });

    if (spaceId && spaceId !== DEFAULT_SPACE_ID) {
      this.httpServiceSetup.basePath.set(fakeRequest, addSpaceIdToPath('/', spaceId));
    }

    return fakeRequest;
  }

  protected toReadonly(soClient: SavedObjectsClientContract): SavedObjectsClientContract {
    return new Proxy(soClient, {
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
  }

  /**
   * Creates a SavedObjects client that is scoped to a space (default: `Default`)
   */
  createInternalScopedSoClient({
    spaceId = DEFAULT_SPACE_ID,
    readonly = true,
  }: Partial<{ spaceId: string; readonly: boolean }> = {}): SavedObjectsClientContract {
    const soClient = this.savedObjectsServiceStart.getScopedClient(
      this.createFakeHttpRequest(spaceId),
      { excludedExtensions: [SECURITY_EXTENSION_ID] }
    );

    if (readonly) {
      return this.toReadonly(soClient);
    }

    return soClient;
  }

  /**
   * Create a SavedObjects client that is un-scoped to a space and thus can access all
   * data across all spaces.
   *
   * **WARNING:** Use with care!
   */
  createInternalUnscopedSoClient(readonly: boolean = true): SavedObjectsClientContract {
    const soClient = this.savedObjectsServiceStart.getScopedClient(this.createFakeHttpRequest(), {
      excludedExtensions: [SECURITY_EXTENSION_ID, SPACES_EXTENSION_ID],
    });

    if (readonly) {
      return this.toReadonly(soClient);
    }

    return soClient;
  }
}
