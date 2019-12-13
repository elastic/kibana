/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { Observable, Subscription, BehaviorSubject } from 'rxjs';
import { NotificationsStart, CoreStart, CoreSetup, ToastsApi } from 'kibana/public';
import { IEmbeddableStart } from 'src/plugins/embeddable/public';
import { EuiProgress, EuiTitle } from '@elastic/eui';
import uuid from 'uuid';
import {
  SearchCollectorFactory,
  ISearchGeneric,
  SearchCollector,
  IResponseTypesMap,
  IKibanaSearchRequest,
  TStrategyTypes,
  SearchCollectorFactoryInner,
  DataPublicPluginStart,
} from '../../../../../src/plugins/data/public';
import { toMountPoint } from '../../../../../src/plugins/kibana_react/public';
import { SearchCollectorToast } from './search_collector_toast';
import {
  BackgroundSearchCollection,
  getBgSearchCollections,
  createBgSearchCollection,
  getBgSearchCollection,
} from './bg_search_collection';

function createHash(request: IKibanaSearchRequest, type?: string) {
  const hash = JSON.stringify(request) + type;
  console.log('createHash: request is ', request);
  console.log('createHash: hash is, ', hash);
  return hash;
}

interface Search<T extends TStrategyTypes> {
  response$: Observable<IResponseTypesMap[T]>;
  type?: T;
  id?: string;
  total: number;
  loaded: number;
  abortController: AbortController;
  subscription?: Subscription;
  request: IKibanaSearchRequest;
}

export class AdvancedSearchCollector implements SearchCollector {
  public searches: { [key: string]: Search<string> } = {};

  public total: number = 1;
  public loaded: number = 0;
  public toast?: ReturnType<ToastsApi['add']>;
  private usingBgSearch: boolean = false;
  public updateListener$ = new BehaviorSubject(this);
  public backgroundSearchUrlBuilder?: (
    searchCollectionId: string
  ) => { url: string; name: string; onComplete: () => void };

  constructor(
    public id: string,
    public innerSearch: ISearchGeneric,
    private coreStart: CoreStart
  ) {}

  clearCache() {
    console.log('Clearing search cache');
    this.abort();
    this.searches = {};
  }

  async initialize() {
    if (this.id) {
      const bgSearch = await getBgSearchCollection(this.coreStart.savedObjects.client, this.id);

      if (bgSearch && !bgSearch.error) {
        await this.loadSearchCollection(bgSearch.attributes);
      }
    }
  }

  private showToast() {
    this.toast = this.coreStart.notifications.toasts.add(
      {
        text: toMountPoint(
          <SearchCollectorToast
            searchCollector$={this.updateListener$}
            cancel={this.abort}
            sendToBackground={this.backgroundSearchUrlBuilder ? this.sendToBackground : undefined}
          />
        ),
      },
      9999999999
    );
  }

  private closeToast() {
    if (this.toast) {
      this.coreStart.notifications.toasts.remove(this.toast);
      delete this.toast;
    }
  }

  public abortAndDestroySearch(hash: string) {
    const search = this.searches[hash];
    search.abortController.abort();
    search.subscription.unsubscribe();
    delete this.searches[hash];
    this.calculateProgress();
  }

  public sendToBackground = async () => {
    if (!this.backgroundSearchUrlBuilder) {
      throw new Error('need to set backgroundSearchUrlBuilder');
    }

    const id = uuid.v4();
    const { url, name, onComplete } = this.backgroundSearchUrlBuilder(id);
    const bgSearches: Array<{ id: string; type?: string; request: string }> = Object.values(
      this.searches
    )
      .filter(search => search.id !== undefined)
      .map(s => ({ id: s.id!, type: s.type, request: JSON.stringify(s.request) }));
    await createBgSearchCollection(this.coreStart.savedObjects.client, {
      searches: bgSearches,
      name,
      url,
      state: url,
      id,
    });
    onComplete();
  };

  public loadSearchCollection(backgroundSearch: BackgroundSearchCollection) {
    this.usingBgSearch = true;
    backgroundSearch.searches.forEach(search => {
      const request = JSON.parse(search.request);
      const type = search.type;
      const hash = createHash(request, type);
      const abortController = new AbortController();
      console.log('AdvancedSearchCollector: innerSearch', JSON.stringify(request));
      const response$ = this.innerSearch(
        { id: search.id },
        { signal: abortController.signal },
        type
      );
      this.searches[hash] = {
        response$,
        abortController,
        total: 1,
        loaded: 0,
        type,
        request,
      };
      const subscription = response$.subscribe(response => {
        console.log('AdvancedSearchCollector: Got response back: ', response);
        if (response.id) {
          this.searches[hash].id = response.id;
        }
        this.searches[hash].total = response.total || 1;
        this.searches[hash].loaded = response.loaded || 1;
        this.calculateProgress();
        // Think: what to do about responses that are complete?
        // clear them from the cache?
      });
      this.searches[hash].subscription = subscription;
    });
  }

  public calculateProgress() {
    let total = 0;
    let loaded = 0;
    Object.values(this.searches).forEach(search => {
      total += search.total;
      loaded += search.loaded;
    });

    this.total = total;
    this.loaded = loaded;

    if (this.total <= this.loaded) {
      this.closeToast();
    } else {
      if (!this.toast) {
        this.showToast();
      }
    }

    this.updateListener$.next(this);
  }

  public search: ISearchGeneric = (request, options, type) => {
    console.log('AdvancedSearchCollector: search', JSON.stringify(request));
    const hash = createHash(request, type);

    const signal = options?.signal;
    if (signal) {
      signal.addEventListener('abort', () => {
        if (this.searches[hash]) {
          this.abortAndDestroySearch(hash);
        }
      });
    }

    const existingSearch = this.searches[hash];

    if (existingSearch) {
      console.log('AdvancedSearchCollector, found existing search', existingSearch);

      return existingSearch.response$;
    } else {
      return this.startSearch(request, options, type);
    }
  };

  public startSearch: ISearchGeneric = (request, options, type) => {
    const hash = createHash(request, type);
    const abortController = new AbortController();
    console.log('AdvancedSearchCollector: innerSearch', JSON.stringify(request));
    const response$ = this.innerSearch(
      request,
      { ...options, signal: abortController.signal },
      type
    );
    this.searches[hash] = {
      response$,
      abortController,
      total: 1,
      loaded: 0,
      type,
      request,
    };
    const subscription = response$.subscribe(response => {
      console.log('AdvancedSearchCollector: Got response back: ', response);
      if (response.id) {
        this.searches[hash].id = response.id;
      }
      this.searches[hash].total = response.total || 1;
      this.searches[hash].loaded = response.loaded || 1;
      this.calculateProgress();
      // Think: what to do about responses that are complete?
      // clear them from the cache?
    });
    this.searches[hash].subscription = subscription;
    return response$;
  };

  abort = () => {
    Object.keys(this.searches).forEach(hash => this.abortAndDestroySearch(hash));
  };

  public destroy() {
    this.abort();
    if (this.toast) {
      this.coreStart.notifications.toasts.remove(this.toast);
    }
  }
}

export const getSearchCollectorFactoryFn = (
  getStartServices: CoreSetup<{
    data: DataPublicPluginStart;
  }>['getStartServices']
): SearchCollectorFactoryInner => async (id, search) => {
  const [coreStart] = await getStartServices();
  //  const collections = await getBgSearchCollections(coreStart.savedObjects.client);
  const collector = new AdvancedSearchCollector(id, search, coreStart);
  await collector.initialize();
  // const collection = collections.find(c => c.id === id);
  // if (collection) {
  //   Object.values(collection.attributes.searches).forEach(s => {
  //     collector.search({ id: s.id }, {}, s.type);
  //   });
  // }
  return collector;
};
