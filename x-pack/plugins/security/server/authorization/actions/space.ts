/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SpaceActions as SpaceActionsType } from '@kbn/security-plugin-types-server';

export class SpaceActions implements SpaceActionsType {
  private readonly prefix: string;

  constructor() {
    this.prefix = `space:`;
  }

  public get manage(): string {
    return `${this.prefix}manage`;
  }
}
