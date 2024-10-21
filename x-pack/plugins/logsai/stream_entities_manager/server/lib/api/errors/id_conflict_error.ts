/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ApiScraperDefinition } from '../../../../common/types';

export class IdConflict extends Error {
  public definition: ApiScraperDefinition;

  constructor(message: string, def: ApiScraperDefinition) {
    super(message);
    this.name = 'IdConflict';
    this.definition = def;
  }
}
