/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { actionsFactory } from '.';

const createMockConfig = (settings: Record<string, any> = {}) => {
  const mockConfig = {
    get: jest.fn(),
  };

  mockConfig.get.mockImplementation(key => settings[key]);

  return mockConfig;
};

describe('#login', () => {
  test('returns action:login', () => {
    const mockConfig = createMockConfig();

    const actions = actionsFactory(mockConfig);

    expect(actions.login).toEqual('login:');
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
    const operation = 'saved-object-action';

    const result = actions.savedObject.get(type, operation);

    expect(result).toEqual(`saved_object:${type}/${operation}`);
  });

  [null, undefined, '', 1, true, {}].forEach((type: any) => {
    test(`type of ${JSON.stringify(type)} throws error`, () => {
      const mockConfig = createMockConfig();
      const actions = actionsFactory(mockConfig);

      expect(() =>
        actions.savedObject.get(type, 'saved-object-action')
      ).toThrowErrorMatchingSnapshot();
    });
  });

  [null, undefined, '', 1, true, {}].forEach((operation: any) => {
    test(`action of ${JSON.stringify(operation)} throws error`, () => {
      const mockConfig = createMockConfig();
      const actions = actionsFactory(mockConfig);

      expect(() =>
        actions.savedObject.get('saved-object-type', operation)
      ).toThrowErrorMatchingSnapshot();
    });
  });

  describe('#spaces.manage', () => {
    test('returns action:manage_spaces/*', () => {
      const mockConfig = createMockConfig();

      const actions = actionsFactory(mockConfig);

      expect(actions.space.manage).toEqual('space:manage');
    });
  });
});
