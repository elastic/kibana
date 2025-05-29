/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IntegrationType } from '@kbn/wci-common';
import type { WorkchatIntegrationDefinition } from '@kbn/wci-server';

export class IntegrationRegistry {
  private allowRegistration = true;
  private integrationTypes = new Map<IntegrationType, WorkchatIntegrationDefinition>();

  register(definition: WorkchatIntegrationDefinition) {
    if (!this.allowRegistration) {
      throw new Error(`Tried to register tool but allowRegistration is false`);
    }
    if (this.has(definition.getType())) {
      throw new Error(`Tried to register Tool [${definition.getType()}], but already registered`);
    }
    this.integrationTypes.set(definition.getType(), definition);
  }

  blockRegistration() {
    this.allowRegistration = false;
  }

  has(type: IntegrationType) {
    return this.integrationTypes.has(type);
  }

  get(type: IntegrationType) {
    if (!this.has(type)) {
      throw new Error(`Tool definition for type [${type}] not found`);
    }
    return this.integrationTypes.get(type)!;
  }

  getAll() {
    return [...this.integrationTypes.values()];
  }
}
