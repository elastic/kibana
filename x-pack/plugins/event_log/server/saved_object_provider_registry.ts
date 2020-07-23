/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { KibanaRequest, SavedObjectsServiceStart } from 'src/core/server';

export type SavedObjectProvider = (request: KibanaRequest, id: string) => Promise<unknown>;

export class SavedObjectProviderRegistry {
  private providers = new Map<string, SavedObjectProvider>();

  constructor(private savedObjectsService: SavedObjectsServiceStart) {}

  public registerProvider(type: string, provider: SavedObjectProvider) {
    if (this.providers.has(type)) {
      throw new Error(
        i18n.translate(
          'xpack.eventLog.savedObjectProviderRegistry.registerProvider.duplicateProvider',
          {
            defaultMessage:
              'The Event Log has already registered a Provider for the Save Object type "{type}".',
            values: {
              type,
            },
          }
        )
      );
    }
    this.providers.set(type, provider);
  }

  public async getSavedObject(request: KibanaRequest, type: string, id: string): Promise<unknown> {
    return this.providers.has(type)
      ? this.providers.get(type)!(request, id)
      : this.savedObjectsService.getScopedClient(request).get(type, id);
  }
}
