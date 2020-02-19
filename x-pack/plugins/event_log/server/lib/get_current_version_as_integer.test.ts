/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

describe('getCurrentVersionAsInteger', () => {
  beforeEach(() => jest.resetModules());

  test('should parse 8.0.0', () => {
    jest.mock('../../../../package.json', () => ({
      version: '8.0.0',
    }));
    const { getCurrentVersionAsInteger } = jest.requireActual('./get_current_version_as_integer');
    expect(getCurrentVersionAsInteger()).toEqual(80000);
  });

  test('should parse 8.1.0', () => {
    jest.mock('../../../../package.json', () => ({
      version: '8.1.0',
    }));
    const { getCurrentVersionAsInteger } = jest.requireActual('./get_current_version_as_integer');
    expect(getCurrentVersionAsInteger()).toEqual(80100);
  });

  test('should parse 8.1.2', () => {
    jest.mock('../../../../package.json', () => ({
      version: '8.1.2',
    }));
    const { getCurrentVersionAsInteger } = jest.requireActual('./get_current_version_as_integer');
    expect(getCurrentVersionAsInteger()).toEqual(80102);
  });

  test('should parse v8.1.2', () => {
    jest.mock('../../../../package.json', () => ({
      version: 'v8.1.2',
    }));
    const { getCurrentVersionAsInteger } = jest.requireActual('./get_current_version_as_integer');
    expect(getCurrentVersionAsInteger()).toEqual(80102);
  });
});
