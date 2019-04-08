/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { actionsFactory } from './actions';

const createMockConfig = (settings = {}) => {
  const mockConfig = {
    get: jest.fn()
  };

  mockConfig.get.mockImplementation(key => settings[key]);

  return mockConfig;
};

describe('#login', () => {
  test('returns action:login', () => {
    const mockConfig = createMockConfig();

    const actions = actionsFactory(mockConfig);

    expect(actions.login).toEqual('action:login');
  });
});

describe('#version', () => {
  test(`returns version:\${config.get('pkg.version')}`, () => {
    const version = 'mock-version';
    const mockConfig = createMockConfig({ 'pkg.version': version });

    const actions = actionsFactory(mockConfig);

    expect(actions.version).toEqual(`version:${version}`);
  });
});

describe('#getSavedObjectAction()', () => {
  test('uses type and action to build action', () => {
    const mockConfig = createMockConfig();
    const actions = actionsFactory(mockConfig);
    const type = 'saved-object-type';
    const action = 'saved-object-action';

    const result = actions.getSavedObjectAction(type, action);

    expect(result).toEqual(`action:saved_objects/${type}/${action}`);
  });

  [null, undefined, '', 1, true, {}].forEach(type => {
    test(`type of ${JSON.stringify(type)} throws error`, () => {
      const mockConfig = createMockConfig();
      const actions = actionsFactory(mockConfig);

      expect(() => actions.getSavedObjectAction(type, 'saved-object-action')).toThrowErrorMatchingSnapshot();
    });
  });

  [null, undefined, '', 1, true, {}].forEach(action => {
    test(`action of ${JSON.stringify(action)} throws error`, () => {
      const mockConfig = createMockConfig();
      const actions = actionsFactory(mockConfig);

      expect(() => actions.getSavedObjectAction('saved-object-type', action)).toThrowErrorMatchingSnapshot();
    });
  });

  describe('#manageSpaces', () => {
    test('returns action:manage_spaces/*', () => {
      const mockConfig = createMockConfig();

      const actions = actionsFactory(mockConfig);

      expect(actions.manageSpaces).toEqual('action:manage_spaces/*');
    });
  });
});
