/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EntityDefinition } from '@kbn/entities-schema';

export class EntitySecurityException extends Error {
  public definition: EntityDefinition;

  constructor(message: string, def: EntityDefinition) {
    super(message);
    this.name = 'EntitySecurityException';
    this.definition = def;
  }
}
