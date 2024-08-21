/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpStart } from '@kbn/core/public';
import { CreateEntityDefinitionQuery, DeleteEntityDefinitionQuery } from '@kbn/entities-schema';
import { EntityManagerUnauthorizedError } from './errors';
import { IEntityClient } from '../types';
import {
  ManagedEntityEnabledResponse,
  EnableManagedEntityResponse,
  DisableManagedEntityResponse,
} from '../../common/types_api';

export class EntityClient implements IEntityClient {
  constructor(private readonly http: HttpStart) {}

  async isManagedEntityDiscoveryEnabled(): Promise<ManagedEntityEnabledResponse> {
    return await this.http.get('/internal/entities/managed/enablement');
  }

  async enableManagedEntityDiscovery(
    query?: CreateEntityDefinitionQuery
  ): Promise<EnableManagedEntityResponse> {
    try {
      return await this.http.put('/internal/entities/managed/enablement', {
        query,
      });
    } catch (err) {
      if (err.body?.statusCode === 403) {
        throw new EntityManagerUnauthorizedError(err.body.message);
      }
      throw err;
    }
  }

  async disableManagedEntityDiscovery(
    query?: DeleteEntityDefinitionQuery
  ): Promise<DisableManagedEntityResponse> {
    try {
      return await this.http.delete('/internal/entities/managed/enablement', { query });
    } catch (err) {
      if (err.body?.statusCode === 403) {
        throw new EntityManagerUnauthorizedError(err.body.message);
      }
      throw err;
    }
  }
}
