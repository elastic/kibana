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
  test('returns login:', () => {
    const mockConfig = createMockConfig();

    const actions = actionsFactory(mockConfig);

    expect(actions.login).toBe('login:');
  });
});

describe('#version', () => {
  test("returns `version:${config.get('pkg.version')}`", () => {
    const version = 'mock-version';
    const mockConfig = createMockConfig({ 'pkg.version': version });

    const actions = actionsFactory(mockConfig);

    expect(actions.version).toBe(`version:${version}`);
  });
});
