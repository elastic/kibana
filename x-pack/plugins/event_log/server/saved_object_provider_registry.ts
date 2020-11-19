/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { KibanaRequest, SavedObjectsClientContract } from 'src/core/server';

import { fromNullable, getOrElse } from 'fp-ts/lib/Option';
import { pipe } from 'fp-ts/lib/pipeable';

export type SavedObjectGetter = (
  ...params: Parameters<SavedObjectsClientContract['get']>
) => Promise<unknown>;
export type SavedObjectProvider = (request: KibanaRequest) => SavedObjectGetter;

export class SavedObjectProviderRegistry {
  private providers = new Map<string, SavedObjectProvider>();
  private defaultProvider?: SavedObjectProvider;

  constructor() {}

  public registerDefaultProvider(provider: SavedObjectProvider) {
    this.defaultProvider = provider;
  }

  public registerProvider(type: string, provider: SavedObjectProvider) {
    if (this.providers.has(type)) {
      throw new Error(
        `The Event Log has already registered a Provider for the Save Object type "${type}".`
      );
    }
    this.providers.set(type, provider);
  }

  public getProvidersClient(request: KibanaRequest): SavedObjectGetter {
    if (!this.defaultProvider) {
      throw new Error(
        i18n.translate(
          'xpack.eventLog.savedObjectProviderRegistry.getProvidersClient.noDefaultProvider',
          {
            defaultMessage: 'The Event Log requires a default Provider.',
          }
        )
      );
    }

    // `scopedProviders` is a cache of providers which are scoped t othe current request.
    // The client will only instantiate a provider on-demand and it will cache each
    // one to enable the request to reuse each provider.
    const scopedProviders = new Map<string, SavedObjectGetter>();
    const defaultGetter = this.defaultProvider(request);
    return (type: string, id: string) => {
      const getter = pipe(
        fromNullable(scopedProviders.get(type)),
        getOrElse(() => {
          const client = this.providers.has(type)
            ? this.providers.get(type)!(request)
            : defaultGetter;
          scopedProviders.set(type, client);
          return client;
        })
      );
      return getter(type, id);
    };
  }
}
