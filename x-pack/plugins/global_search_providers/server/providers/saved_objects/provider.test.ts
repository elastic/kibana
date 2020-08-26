/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EMPTY } from 'rxjs';
import { TestScheduler } from 'rxjs/testing';
import {
  SavedObjectsFindResponse,
  SavedObjectsFindResult,
  SavedObjectsType,
  SavedObjectTypeRegistry,
} from 'src/core/server';
import { globalSearchPluginMock } from '../../../../global_search/server/mocks';
import {
  GlobalSearchResultProvider,
  GlobalSearchProviderFindOptions,
} from '../../../../global_search/server';
import { createSavedObjectsResultProvider } from './provider';

const getTestScheduler = () =>
  new TestScheduler((actual, expected) => {
    expect(actual).toEqual(expected);
  });

const createFindResponse = (
  results: SavedObjectsFindResult[]
): SavedObjectsFindResponse<unknown> => ({
  saved_objects: results,
  page: 1,
  per_page: 20,
  total: results.length,
});

const createType = (props: Partial<SavedObjectsType>): SavedObjectsType => {
  return {
    name: 'type',
    hidden: false,
    namespaceType: 'single',
    mappings: { properties: {} },
    ...props,
    management: {
      defaultSearchField: 'field',
      getInAppUrl: (obj) => ({ path: `/object/${obj.id}`, uiCapabilitiesPath: '' }),
      ...props.management,
    },
  };
};

const createObject = <T>(
  props: Partial<SavedObjectsFindResult>,
  attributes: T
): SavedObjectsFindResult<T> => {
  return {
    id: 'id',
    type: 'dashboard',
    score: 100,
    references: [],
    ...props,
    attributes,
  };
};

const defaultOption: GlobalSearchProviderFindOptions = {
  preference: 'pref',
  maxResults: 20,
  aborted$: EMPTY,
};

describe('savedObjectsResultProvider', () => {
  let provider: GlobalSearchResultProvider;
  let registry: SavedObjectTypeRegistry;
  let context: ReturnType<typeof globalSearchPluginMock.createProviderContext>;

  beforeEach(() => {
    provider = createSavedObjectsResultProvider();
    registry = new SavedObjectTypeRegistry();

    registry.registerType(
      createType({
        name: 'typeA',
        management: {
          defaultSearchField: 'title',
          getInAppUrl: (obj) => ({ path: `/type-a/${obj.id}`, uiCapabilitiesPath: '' }),
        },
      })
    );
    registry.registerType(
      createType({
        name: 'typeB',
        management: {
          defaultSearchField: 'description',
          getInAppUrl: (obj) => ({ path: `/type-b/${obj.id}`, uiCapabilitiesPath: 'foo' }),
        },
      })
    );

    context = globalSearchPluginMock.createProviderContext();
    context.core.savedObjects.client.find.mockResolvedValue(createFindResponse([]));
    context.core.savedObjects.typeRegistry = registry as any;
  });

  it('has the correct id', () => {
    expect(provider.id).toBe('savedObjects');
  });

  it('calls `savedObjectClient.find` with the correct parameters', () => {
    provider.find('term', defaultOption, context);

    expect(context.core.savedObjects.client.find).toHaveBeenCalledTimes(1);
    expect(context.core.savedObjects.client.find).toHaveBeenCalledWith({
      page: 1,
      perPage: defaultOption.maxResults,
      search: 'term*',
      preference: 'pref',
      searchFields: ['title', 'description'],
      type: ['typeA', 'typeB'],
    });
  });

  it('converts the saved objects to results', async () => {
    context.core.savedObjects.client.find.mockResolvedValue(
      createFindResponse([
        createObject({ id: 'resultA', type: 'typeA', score: 50 }, { title: 'titleA' }),
        createObject({ id: 'resultB', type: 'typeB', score: 78 }, { description: 'titleB' }),
      ])
    );

    const results = await provider.find('term', defaultOption, context).toPromise();
    expect(results).toEqual([
      {
        id: 'resultA',
        title: 'titleA',
        type: 'typeA',
        url: '/type-a/resultA',
        score: 50,
      },
      {
        id: 'resultB',
        title: 'titleB',
        type: 'typeB',
        url: '/type-b/resultB',
        score: 78,
      },
    ]);
  });

  it('only emits results until `aborted$` emits', () => {
    getTestScheduler().run(({ hot, expectObservable }) => {
      // test scheduler doesnt play well with promises. need to workaround by passing
      // an observable instead. Behavior with promise is asserted in previous tests of the suite
      context.core.savedObjects.client.find.mockReturnValue(
        hot('---a', { a: createFindResponse([]) }) as any
      );

      const resultObs = provider.find(
        'term',
        { ...defaultOption, aborted$: hot<undefined>('-(a|)', { a: undefined }) },
        context
      );

      expectObservable(resultObs).toBe('-|');
    });
  });
});
