/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  SavedObjectsFindResult,
  SavedObjectsType,
  SavedObjectTypeRegistry,
  Capabilities,
} from 'src/core/server';
import { mapToResult, mapToResults } from './map_object_to_result';

const createType = (props: Partial<SavedObjectsType>): SavedObjectsType => {
  return {
    name: 'type',
    hidden: false,
    namespaceType: 'single',
    mappings: { properties: {} },
    ...props,
  };
};

const createObject = <T>(
  props: Partial<SavedObjectsFindResult>,
  attributes: T
): SavedObjectsFindResult<T> => {
  return {
    id: 'id',
    type: 'dashboard',
    references: [],
    score: 100,
    ...props,
    attributes,
  };
};

describe('mapToResult', () => {
  it('converts a savedObject to a result', () => {
    const type = createType({
      name: 'dashboard',
      management: {
        defaultSearchField: 'title',
        getInAppUrl: (obj) => ({ path: `/dashboard/${obj.id}`, uiCapabilitiesPath: '' }),
      },
    });

    const obj = createObject(
      {
        id: 'dash1',
        type: 'dashboard',
        score: 42,
      },
      {
        title: 'My dashboard',
      }
    );

    expect(mapToResult(obj, type)).toEqual({
      id: 'dash1',
      title: 'My dashboard',
      type: 'dashboard',
      url: '/dashboard/dash1',
      score: 42,
    });
  });

  it('throws if the type do not have management information', () => {
    const object = createObject(
      { id: 'dash1', type: 'dashboard', score: 42 },
      { title: 'My dashboard' }
    );

    expect(() => {
      mapToResult(
        object,
        createType({
          name: 'dashboard',
          management: {
            getInAppUrl: (obj) => ({ path: `/dashboard/${obj.id}`, uiCapabilitiesPath: '' }),
          },
        })
      );
    }).toThrowErrorMatchingInlineSnapshot(
      `"Trying to map an object from a type without management metadata"`
    );

    expect(() => {
      mapToResult(
        object,
        createType({
          name: 'dashboard',
          management: {
            defaultSearchField: 'title',
          },
        })
      );
    }).toThrowErrorMatchingInlineSnapshot(
      `"Trying to map an object from a type without management metadata"`
    );

    expect(() => {
      mapToResult(
        object,
        createType({
          name: 'dashboard',
          management: undefined,
        })
      );
    }).toThrowErrorMatchingInlineSnapshot(
      `"Trying to map an object from a type without management metadata"`
    );
  });
});

describe('mapToResults', () => {
  let typeRegistry: SavedObjectTypeRegistry;
  let capabilities: Capabilities;

  beforeEach(() => {
    typeRegistry = new SavedObjectTypeRegistry();

    typeRegistry.registerType(
      createType({
        name: 'typeA',
        management: {
          defaultSearchField: 'title',
          getInAppUrl: (obj) => ({ path: `/type-a/${obj.id}`, uiCapabilitiesPath: 'test.typeA' }),
        },
      })
    );
    typeRegistry.registerType(
      createType({
        name: 'typeB',
        management: {
          defaultSearchField: 'description',
          getInAppUrl: (obj) => ({ path: `/type-b/${obj.id}`, uiCapabilitiesPath: 'test.typeB' }),
        },
      })
    );
    typeRegistry.registerType(
      createType({
        name: 'typeC',
        management: {
          defaultSearchField: 'excerpt',
          getInAppUrl: (obj) => ({ path: `/type-c/${obj.id}`, uiCapabilitiesPath: 'test.typeC' }),
        },
      })
    );
    typeRegistry.registerType(
      createType({
        name: 'inaccessibleType',
        management: {
          defaultSearchField: 'excerpt',
          getInAppUrl: (obj) => ({
            path: `/inaccessible-type/${obj.id}`,
            uiCapabilitiesPath: 'test.inaccessibleType',
          }),
        },
      })
    );

    capabilities = {
      navLinks: {},
      management: {},
      catalogue: {},
      test: {
        typeA: true,
        typeB: true,
        typeC: true,
        inacessibleType: false,
      },
    };
  });

  it('converts savedObjects to results', () => {
    const results = [
      createObject(
        {
          id: 'resultA',
          type: 'typeA',
          score: 100,
        },
        {
          title: 'titleA',
          field: 'noise',
        }
      ),
      createObject(
        {
          id: 'resultC',
          type: 'typeC',
          score: 42,
        },
        {
          excerpt: 'titleC',
          title: 'foo',
        }
      ),
      createObject(
        {
          id: 'resultB',
          type: 'typeB',
          score: 69,
        },
        {
          description: 'titleB',
          bar: 'baz',
        }
      ),
    ];

    expect(mapToResults(results, typeRegistry, capabilities)).toEqual([
      {
        id: 'resultA',
        title: 'titleA',
        type: 'typeA',
        url: '/type-a/resultA',
        score: 100,
      },
      {
        id: 'resultC',
        title: 'titleC',
        type: 'typeC',
        url: '/type-c/resultC',
        score: 42,
      },
      {
        id: 'resultB',
        title: 'titleB',
        type: 'typeB',
        url: '/type-b/resultB',
        score: 69,
      },
    ]);
  });

  it('filters results without permissions', () => {
    const results = [
      createObject(
        {
          id: 'resultA',
          type: 'typeA',
          score: 100,
        },
        {
          title: 'titleA',
          field: 'noise',
        }
      ),
      createObject(
        {
          id: 'inaccessibleResult',
          type: 'inaccessibleType',
          score: 92,
        },
        {
          excerpt: 'inaccessibleTitle',
          title: 'inaccessible',
        }
      ),
    ];

    expect(mapToResults(results, typeRegistry, capabilities)).toEqual([
      {
        id: 'resultA',
        title: 'titleA',
        type: 'typeA',
        url: '/type-a/resultA',
        score: 100,
      },
    ]);
  });
});
