/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpStart } from '@kbn/core/public';
import { IEntityClient } from '../types';
import { MANAGED_ENTITY_ENABLEMENT_ROUTE } from '../../common/constants_entities';
import {
  ManagedEntityEnabledResponse,
  EnableManagedEntityResponse,
  DisableManagedEntityResponse,
} from '../../common/types_api';

export class EntityClient implements IEntityClient {
  constructor(private readonly http: HttpStart) {}

  async isManagedEntityDiscoveryEnabled(): Promise<ManagedEntityEnabledResponse> {
    return await this.http.get(MANAGED_ENTITY_ENABLEMENT_ROUTE);
  }

  async enableManagedEntityDiscovery(): Promise<EnableManagedEntityResponse> {
    return await this.http.put(MANAGED_ENTITY_ENABLEMENT_ROUTE);
  }

  async disableManagedEntityDiscovery(): Promise<DisableManagedEntityResponse> {
    return await this.http.delete(MANAGED_ENTITY_ENABLEMENT_ROUTE);
  }
}
