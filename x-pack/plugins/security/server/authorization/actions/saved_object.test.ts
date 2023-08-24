/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectActions } from './saved_object';

describe('#get', () => {
  [null, undefined, '', 1, true, {}].forEach((type: any) => {
    test(`type of ${JSON.stringify(type)} throws error`, () => {
      const savedObjectActions = new SavedObjectActions();
      expect(() => savedObjectActions.get(type, 'foo-action')).toThrowError(
        'type is required and must be a string'
      );
    });
  });

  [null, undefined, '', 1, true, {}].forEach((operation: any) => {
    test(`operation of ${JSON.stringify(operation)} throws error`, () => {
      const savedObjectActions = new SavedObjectActions();
      expect(() => savedObjectActions.get('foo-type', operation)).toThrowError(
        'operation is required and must be a string'
      );
    });
  });

  test('returns `saved_object:${type}/${operation}`', () => {
    const savedObjectActions = new SavedObjectActions();
    expect(savedObjectActions.get('foo-type', 'bar-operation')).toBe(
      'saved_object:foo-type/bar-operation'
    );
  });
});
