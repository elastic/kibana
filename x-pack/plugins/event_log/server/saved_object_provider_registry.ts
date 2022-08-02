/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { KibanaRequest, SavedObjectsClientContract } from '@kbn/core/server';

import { fromNullable, getOrElse } from 'fp-ts/lib/Option';
import { pipe } from 'fp-ts/lib/pipeable';

export type SavedObjectGetter = (
  ...params: Parameters<SavedObjectsClientContract['get']>
) => Promise<unknown>;

export type SavedObjectBulkGetter = (
  ...params: Parameters<SavedObjectsClientContract['bulkGet']>
) => Promise<unknown>;

export type SavedObjectBulkGetterResult = (type: string, ids: string[]) => Promise<unknown>;

export type SavedObjectProvider = (request: KibanaRequest) => SavedObjectBulkGetter;

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

  public getProvidersClient(request: KibanaRequest): SavedObjectBulkGetterResult {
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

    // would be nice to have a simple version support in API:
    // curl -X GET "localhost:9200/my-index-000001/_mget?pretty" -H 'Content-Type: application/json' -d' { "ids" : ["1", "2"] } '
    const scopedProviders = new Map<string, SavedObjectBulkGetter>();
    const defaultGetter = this.defaultProvider(request);
    return (type: string, ids: string[]) => {
      const objects = ids.map((id: string) => ({ type, id }));
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
      return getter(objects);
    };
  }
}
