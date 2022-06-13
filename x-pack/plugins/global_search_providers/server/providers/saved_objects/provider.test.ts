/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EMPTY } from 'rxjs';
import { toArray } from 'rxjs/operators';
import { TestScheduler } from 'rxjs/testing';
import {
  SavedObjectsFindResponse,
  SavedObjectsFindResult,
  SavedObjectsType,
  SavedObjectTypeRegistry,
} from '@kbn/core/server';
import { globalSearchPluginMock } from '@kbn/global-search-plugin/server/mocks';
import {
  GlobalSearchResultProvider,
  GlobalSearchProviderFindOptions,
} from '@kbn/global-search-plugin/server';
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

const createType = (
  props: Pick<SavedObjectsType, 'name'> & Partial<SavedObjectsType>
): SavedObjectsType => {
  return {
    hidden: false,
    namespaceType: 'single',
    mappings: { properties: {} },
    ...props,
    management: {
      defaultSearchField: 'field',
      getInAppUrl: (obj) => ({
        path: `/object/${obj.id}`,
        uiCapabilitiesPath: `types.${props.name}`,
      }),
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
          getInAppUrl: (obj) => ({ path: `/type-a/${obj.id}`, uiCapabilitiesPath: 'test.typeA' }),
        },
      })
    );
    registry.registerType(
      createType({
        name: 'typeB',
        management: {
          defaultSearchField: 'description',
          getInAppUrl: (obj) => ({ path: `/type-b/${obj.id}`, uiCapabilitiesPath: 'test.typeB' }),
        },
      })
    );

    context = globalSearchPluginMock.createProviderContext({
      test: {
        typeA: true,
        typeB: true,
      },
    });
    context.core.savedObjects.client.find.mockResolvedValue(createFindResponse([]));
    context.core.savedObjects.typeRegistry = registry as any;
  });

  it('has the correct id', () => {
    expect(provider.id).toBe('savedObjects');
  });

  describe('#find()', () => {
    it('calls `savedObjectClient.find` with the correct parameters', async () => {
      await provider.find({ term: 'term' }, defaultOption, context).toPromise();

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

    it('filters searchable types depending on the `types` parameter', async () => {
      await provider.find({ term: 'term', types: ['typeA'] }, defaultOption, context).toPromise();

      expect(context.core.savedObjects.client.find).toHaveBeenCalledTimes(1);
      expect(context.core.savedObjects.client.find).toHaveBeenCalledWith({
        page: 1,
        perPage: defaultOption.maxResults,
        search: 'term*',
        preference: 'pref',
        searchFields: ['title'],
        type: ['typeA'],
      });
    });

    it('ignore the case for the `types` parameter', async () => {
      await provider.find({ term: 'term', types: ['TyPEa'] }, defaultOption, context).toPromise();

      expect(context.core.savedObjects.client.find).toHaveBeenCalledTimes(1);
      expect(context.core.savedObjects.client.find).toHaveBeenCalledWith({
        page: 1,
        perPage: defaultOption.maxResults,
        search: 'term*',
        preference: 'pref',
        searchFields: ['title'],
        type: ['typeA'],
      });
    });

    it('calls `savedObjectClient.find` with the correct references when the `tags` option is set', async () => {
      await provider
        .find({ term: 'term', tags: ['tag-id-1', 'tag-id-2'] }, defaultOption, context)
        .toPromise();

      expect(context.core.savedObjects.client.find).toHaveBeenCalledTimes(1);
      expect(context.core.savedObjects.client.find).toHaveBeenCalledWith({
        page: 1,
        perPage: defaultOption.maxResults,
        search: 'term*',
        preference: 'pref',
        searchFields: ['title', 'description'],
        hasReference: [
          { type: 'tag', id: 'tag-id-1' },
          { type: 'tag', id: 'tag-id-2' },
        ],
        type: ['typeA', 'typeB'],
      });
    });

    it('does not call `savedObjectClient.find` if all params are empty', async () => {
      const results = await provider.find({}, defaultOption, context).pipe(toArray()).toPromise();

      expect(context.core.savedObjects.client.find).not.toHaveBeenCalled();
      expect(results).toEqual([[]]);
    });

    it('converts the saved objects to results', async () => {
      context.core.savedObjects.client.find.mockResolvedValue(
        createFindResponse([
          createObject({ id: 'resultA', type: 'typeA', score: 50 }, { title: 'titleA' }),
          createObject({ id: 'resultB', type: 'typeB', score: 78 }, { description: 'titleB' }),
        ])
      );

      const results = await provider.find({ term: 'term' }, defaultOption, context).toPromise();
      expect(results).toEqual([
        {
          id: 'resultA',
          title: 'titleA',
          type: 'typeA',
          url: '/type-a/resultA',
          score: 50,
          meta: { tagIds: [], displayName: 'typeA' },
        },
        {
          id: 'resultB',
          title: 'titleB',
          type: 'typeB',
          url: '/type-b/resultB',
          score: 78,
          meta: { tagIds: [], displayName: 'typeB' },
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
          { term: 'term' },
          { ...defaultOption, aborted$: hot<undefined>('-(a|)', { a: undefined }) },
          context
        );

        expectObservable(resultObs).toBe('-|');
      });
    });
  });

  describe('#getSearchableTypes', () => {
    it('returns the searchable saved object types', async () => {
      const types = await provider.getSearchableTypes(context);

      expect(types.sort()).toEqual(['typeA', 'typeB']);
    });
  });
});
