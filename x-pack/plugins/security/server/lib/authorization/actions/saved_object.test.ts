/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectActions } from './saved_object';

describe('#all', () => {
  test(`returns saved_object:*`, () => {
    const savedObjectActions = new SavedObjectActions();
    expect(savedObjectActions.all).toBe('saved_object:*');
  });
});

describe('#get', () => {
  [null, undefined, '', 1, true, {}].forEach((type: any) => {
    test(`type of ${JSON.stringify(type)} throws error`, () => {
      const savedObjectActions = new SavedObjectActions();
      expect(() => savedObjectActions.get(type, 'foo-action')).toThrowErrorMatchingSnapshot();
    });
  });

  [null, undefined, '', 1, true, {}].forEach((operation: any) => {
    test(`operation of ${JSON.stringify(operation)} throws error`, () => {
      const savedObjectActions = new SavedObjectActions();
      expect(() => savedObjectActions.get('foo-type', operation)).toThrowErrorMatchingSnapshot();
    });
  });

  test('returns `saved_object:${type}/${operation}`', () => {
    const savedObjectActions = new SavedObjectActions();
    expect(savedObjectActions.get('foo-type', 'bar-operation')).toBe(
      'saved_object:foo-type/bar-operation'
    );
  });
});

describe('#allOperations', () => {
  [null, undefined, '', 1, true, {}].forEach((type: any) => {
    test(`type of ${JSON.stringify(type)} throws error`, () => {
      const savedObjectActions = new SavedObjectActions();
      expect(() => savedObjectActions.allOperations(type)).toThrowErrorMatchingSnapshot();
    });
  });

  test('returns all operations for a singular type', () => {
    const savedObjectActions = new SavedObjectActions();
    expect(savedObjectActions.allOperations('foo-type')).toEqual([
      'saved_object:foo-type/bulk_get',
      'saved_object:foo-type/get',
      'saved_object:foo-type/find',
      'saved_object:foo-type/create',
      'saved_object:foo-type/bulk_create',
      'saved_object:foo-type/update',
      'saved_object:foo-type/delete',
    ]);
  });

  [null, undefined, '', 1, true, {}].forEach((type: any) => {
    test(`if type of ${JSON.stringify(type)} included in types throws error`, () => {
      const savedObjectActions = new SavedObjectActions();
      expect(() =>
        savedObjectActions.allOperations([type, 'foo-type'])
      ).toThrowErrorMatchingSnapshot();
    });
  });

  test('returns all operations for multiple types', () => {
    const savedObjectActions = new SavedObjectActions();
    expect(savedObjectActions.allOperations(['foo-type', 'bar-type'])).toEqual([
      'saved_object:foo-type/bulk_get',
      'saved_object:foo-type/get',
      'saved_object:foo-type/find',
      'saved_object:foo-type/create',
      'saved_object:foo-type/bulk_create',
      'saved_object:foo-type/update',
      'saved_object:foo-type/delete',
      'saved_object:bar-type/bulk_get',
      'saved_object:bar-type/get',
      'saved_object:bar-type/find',
      'saved_object:bar-type/create',
      'saved_object:bar-type/bulk_create',
      'saved_object:bar-type/update',
      'saved_object:bar-type/delete',
    ]);
  });
});

describe('#readOperations', () => {
  [null, undefined, '', 1, true, {}].forEach((type: any) => {
    test(`type of ${JSON.stringify(type)} throws error`, () => {
      const savedObjectActions = new SavedObjectActions();
      expect(() => savedObjectActions.readOperations(type)).toThrowErrorMatchingSnapshot();
    });
  });

  test('returns read operations for a singular type', () => {
    const savedObjectActions = new SavedObjectActions();
    expect(savedObjectActions.readOperations('foo-type')).toEqual([
      'saved_object:foo-type/bulk_get',
      'saved_object:foo-type/get',
      'saved_object:foo-type/find',
    ]);
  });

  [null, undefined, '', 1, true, {}].forEach((type: any) => {
    test(`if type of ${JSON.stringify(type)} included in types throws error`, () => {
      const savedObjectActions = new SavedObjectActions();
      expect(() =>
        savedObjectActions.readOperations([type, 'foo-type'])
      ).toThrowErrorMatchingSnapshot();
    });
  });

  test('returns read operations for multiple types', () => {
    const savedObjectActions = new SavedObjectActions();
    expect(savedObjectActions.readOperations(['foo-type', 'bar-type'])).toEqual([
      'saved_object:foo-type/bulk_get',
      'saved_object:foo-type/get',
      'saved_object:foo-type/find',
      'saved_object:bar-type/bulk_get',
      'saved_object:bar-type/get',
      'saved_object:bar-type/find',
    ]);
  });
});

describe('#writeOperations', () => {
  [null, undefined, '', 1, true, {}].forEach((type: any) => {
    test(`type of ${JSON.stringify(type)} throws error`, () => {
      const savedObjectActions = new SavedObjectActions();
      expect(() => savedObjectActions.writeOperations(type)).toThrowErrorMatchingSnapshot();
    });
  });

  test('returns write operations for a singular type', () => {
    const savedObjectActions = new SavedObjectActions();
    expect(savedObjectActions.writeOperations('foo-type')).toEqual([
      'saved_object:foo-type/create',
      'saved_object:foo-type/bulk_create',
      'saved_object:foo-type/update',
      'saved_object:foo-type/delete',
    ]);
  });

  [null, undefined, '', 1, true, {}].forEach((type: any) => {
    test(`if type of ${JSON.stringify(type)} included in types throws error`, () => {
      const savedObjectActions = new SavedObjectActions();
      expect(() =>
        savedObjectActions.writeOperations([type, 'foo-type'])
      ).toThrowErrorMatchingSnapshot();
    });
  });

  test('returns write operations for multiple types', () => {
    const savedObjectActions = new SavedObjectActions();
    expect(savedObjectActions.writeOperations(['foo-type', 'bar-type'])).toEqual([
      'saved_object:foo-type/create',
      'saved_object:foo-type/bulk_create',
      'saved_object:foo-type/update',
      'saved_object:foo-type/delete',
      'saved_object:bar-type/create',
      'saved_object:bar-type/bulk_create',
      'saved_object:bar-type/update',
      'saved_object:bar-type/delete',
    ]);
  });
});
