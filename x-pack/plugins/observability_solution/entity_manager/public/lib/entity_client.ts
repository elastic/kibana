/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, CoreStart } from '@kbn/core/public';
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

type EntityManagerRepositoryClient = RouteRepositoryClient<EntityManagerRouteRepository>;

type QueryParamOf<T extends { params?: any }> = Exclude<T['params'], undefined>['query'];

type DeleteEntityDefinitionQuery = QueryParamOf<
  ClientRequestParamsOf<
    EntityManagerRouteRepository,
    'POST /internal/entities/managed_definitions/_disable'
  >
>;

type CreateEntityDefinitionQuery = QueryParamOf<
  ClientRequestParamsOf<
    EntityManagerRouteRepository,
    'POST /internal/entities/managed_definitions/_enable'
  >
>;

export class EntityClient {
  public readonly repositoryClient: EntityManagerRepositoryClient;

  constructor(core: CoreStart | CoreSetup) {
    this.repositoryClient = createRepositoryClient<EntityManagerRouteRepository>(core).fetch;
  }

  async isManagedEntityDiscoveryEnabled(): Promise<ManagedEntityEnabledResponse> {
    return await this.repositoryClient('POST /internal/entities/managed_definitions/_status');
  }

  async enableManagedEntityDiscovery(
    query?: CreateEntityDefinitionQuery
  ): Promise<EnableManagedEntityResponse> {
    try {
      return await this.repositoryClient('POST /internal/entities/managed_definitions/_enable', {
        params: {
          query: {
            installOnly: query?.installOnly,
          },
        },
      });
    } catch (err) {
      if (isHttpFetchError(err) && err.body?.statusCode === 403) {
        throw new EntityManagerUnauthorizedError(err.body.message);
      }
      throw err;
    }
  }

  async disableManagedEntityDiscovery(
    query?: DeleteEntityDefinitionQuery
  ): Promise<DisableManagedEntityResponse> {
    try {
      return await this.repositoryClient('POST /internal/entities/managed_definitions/_disable', {
        params: {
          query: {
            deleteData: query?.deleteData,
          },
        },
      });
    } catch (err) {
      if (isHttpFetchError(err) && err.body?.statusCode === 403) {
        throw new EntityManagerUnauthorizedError(err.body.message);
      }
      throw err;
    }
  }
}
