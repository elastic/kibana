/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OAMDefinition } from '@kbn/oam-schema';

export class OAMSecurityException extends Error {
  public defintion: OAMDefinition;

  constructor(message: string, def: OAMDefinition) {
    super(message);
    this.name = 'OAMSecurityException';
    this.defintion = def;
  }
}
