/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EntityDefinition } from '@kbn/oam-schema';

export class EntityIdConflict extends Error {
  public defintion: EntityDefinition;

  constructor(message: string, def: EntityDefinition) {
    super(message);
    this.name = 'EntityIdConflict';
    this.defintion = def;
  }
}
