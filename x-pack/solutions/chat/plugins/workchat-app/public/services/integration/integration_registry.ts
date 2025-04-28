/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IntegrationType } from '@kbn/wci-common';
import type { IntegrationComponentDescriptor } from '@kbn/wci-browser';

export class IntegrationRegistry {
  private allowRegistration = true;
  private integrationTypes = new Map<IntegrationType, IntegrationComponentDescriptor>();

  register(definition: IntegrationComponentDescriptor) {
    if (!this.allowRegistration) {
      throw new Error(`Tried to register integration but allowRegistration is false`);
    }
    if (this.has(definition.getType())) {
      throw new Error(
        `Tried to register Integration [${definition.getType()}], but already registered`
      );
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
      throw new Error(`Integration definition for type [${type}] not found`);
    }
    return this.integrationTypes.get(type)!;
  }

  getAll() {
    return [...this.integrationTypes.values()];
  }
}
