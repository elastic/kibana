/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

interface BaseItem {
  id: string;
}

export class CaseRegistry<T extends BaseItem> {
  private readonly collection: Map<string, T> = new Map();

  constructor(private readonly name: string) {}

  /**
   * Returns true if the registry has the given type registered
   */
  public has(id: string) {
    return this.collection.has(id);
  }

  /**
   * Registers an item to the registry
   */
  public register(item: T) {
    if (this.has(item.id)) {
      throw new Error(
        i18n.translate('xpack.cases.registry.duplicateItemErrorMessage', {
          defaultMessage: `Item "{id}" is already registered on registry ${this.name}`,
          values: {
            id: item.id,
          },
        })
      );
    }

    this.collection.set(item.id, item);
  }

  /**
   * Returns an item, throw error if not registered
   */
  public get(id: string): T {
    const item = this.collection.get(id);

    if (!item) {
      throw new Error(
        i18n.translate('xpack.cases.typeRegistry.get.missingActionTypeErrorMessage', {
          defaultMessage: `Item "{id}" is not registered on registry ${this.name}`,
          values: {
            id,
          },
        })
      );
    }

    return item;
  }

  public list() {
    return Array.from(this.collection.values());
  }
}
