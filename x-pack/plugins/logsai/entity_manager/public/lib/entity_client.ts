/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, CoreStart } from '@kbn/core/public';
import { EntityDefinition, EntityDefinitionUpdate } from '@kbn/entities-schema';
import {
  ClientRequestParamsOf,
  RouteRepositoryClient,
  createRepositoryClient,
  isHttpFetchError,
} from '@kbn/server-route-repository-client';
import {
  DisableManagedEntityResponse,
  EnableManagedEntityResponse,
  ManagedEntityEnabledResponse,
} from '../../common/types_api';
import type { EntityManagerRouteRepository } from '../../server';
import { EntityManagerUnauthorizedError } from './errors';

type EntityManagerRepositoryClient = RouteRepositoryClient<EntityManagerRouteRepository, {}>;

type QueryParamOf<T extends { params?: any }> = Exclude<T['params'], undefined>['query'];

type DeleteEntityDefinitionQuery = QueryParamOf<
  ClientRequestParamsOf<
    EntityManagerRouteRepository,
    'DELETE /internal/entities/managed/enablement'
  >
>;

type CreateEntityDefinitionQuery = QueryParamOf<
  ClientRequestParamsOf<EntityManagerRouteRepository, 'PUT /internal/entities/managed/enablement'>
>;

function rethrowAuthorizationError<T, U extends (...args: any[]) => Promise<T>>(cb: U): Promise<T> {
  return cb().catch((error) => {
    if (isHttpFetchError(error) && error.body?.statusCode === 403) {
      throw new EntityManagerUnauthorizedError(error.body.message);
    }
    throw error;
  });
}

export class EntityClient {
  public readonly repositoryClient: EntityManagerRepositoryClient['fetch'];

  constructor(core: CoreStart | CoreSetup) {
    this.repositoryClient = createRepositoryClient<EntityManagerRouteRepository>(core).fetch;
  }

  async isManagedEntityDiscoveryEnabled(): Promise<ManagedEntityEnabledResponse> {
    return await this.repositoryClient('GET /internal/entities/managed/enablement', {
      caching: {
        mode: 'never',
      },
    });
  }

  async enableManagedEntityDiscovery(
    query?: CreateEntityDefinitionQuery
  ): Promise<EnableManagedEntityResponse> {
    return rethrowAuthorizationError(() =>
      this.repositoryClient('PUT /internal/entities/managed/enablement', {
        params: {
          query: {
            installOnly: query?.installOnly,
          },
        },
      })
    );
  }

  async disableManagedEntityDiscovery(
    query?: DeleteEntityDefinitionQuery
  ): Promise<DisableManagedEntityResponse> {
    return rethrowAuthorizationError(() =>
      this.repositoryClient('DELETE /internal/entities/managed/enablement', {
        params: {
          query: {
            deleteData: query?.deleteData,
          },
        },
      })
    );
  }

  async createEntityDefinition(definition: EntityDefinition): Promise<void> {
    return rethrowAuthorizationError(() =>
      this.repositoryClient('POST /internal/entities/definition', {
        params: {
          body: definition,
          query: {
            installOnly: false,
          },
        },
      })
    );
  }

  async updateEntityDefinition(id: string, definition: EntityDefinitionUpdate): Promise<void> {
    return rethrowAuthorizationError(() =>
      this.repositoryClient('PATCH /internal/entities/definition/{id}', {
        params: {
          path: { id },
          body: definition,
          query: {
            installOnly: false,
          },
        },
      })
    );
  }
}
