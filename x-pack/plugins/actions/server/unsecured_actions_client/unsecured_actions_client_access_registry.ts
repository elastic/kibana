/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export class UnsecuredActionsClientAccessRegistry {
  private readonly allowedFeatureIds: Map<string, boolean> = new Map();

  /**
   * Returns if the access registry has the given feature id registered
   */
  public has(id: string) {
    return this.allowedFeatureIds.has(id);
  }

  /**
   * Registers feature id to the access registry
   */
  public register(id: string) {
    this.allowedFeatureIds.set(id, true);
  }
}
