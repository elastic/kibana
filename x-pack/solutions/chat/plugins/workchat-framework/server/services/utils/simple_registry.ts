/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Registry } from '@kbn/wc-framework-types-server';

/**
 * Simple generic registry implementation to be used for various content types.
 */
export class SimpleRegistry<T extends { id: string }> implements Registry<T> {
  private readonly _registry = new Map<string, T>();

  register(entry: T): void {
    if (this._registry.has(entry.id)) {
      throw new Error(`Trying to register entry with id ${entry.id} multiple times`);
    }
    this._registry.set(entry.id, entry);
  }
  has(id: string): boolean {
    return this._registry.has(id);
  }
  get(id: string): T {
    if (!this.has(id)) {
      throw new Error(`No entry found for id [${id}]`);
    }
    return this._registry.get(id)!;
  }
  getAllKeys(): string[] {
    return [...this._registry.keys()];
  }
  getAll(): T[] {
    return [...this._registry.values()];
  }
}
