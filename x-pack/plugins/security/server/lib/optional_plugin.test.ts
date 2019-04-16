/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { createOptionalPlugin } from './optional_plugin';

class FooPlugin {
  get aProp() {
    return 'a prop';
  }

  public aField = 'a field';

  public aMethod() {
    return 'a method';
  }
}

const createMockConfig = (settings: Record<string, any>) => {
  return {
    get: (key: string) => {
      if (!Object.keys(settings).includes(key)) {
        throw new Error('Unknown config key');
      }

      return settings[key];
    },
  };
};

describe('isEnabled', () => {
  test('returns true when config.get(`${configPrefix}.enabled`) is true', () => {
    const config = createMockConfig({ 'xpack.fooPlugin.enabled': true });
    const conditionalFooPlugin = createOptionalPlugin(config, 'xpack.fooPlugin', {}, 'fooPlugin');
    expect(conditionalFooPlugin.isEnabled).toBe(true);
  });

  test('returns false when config.get(`${configPrefix}.enabled`) is false', () => {
    const config = createMockConfig({ 'xpack.fooPlugin.enabled': false });
    const conditionalFooPlugin = createOptionalPlugin(config, 'xpack.fooPlugin', {}, 'fooPlugin');
    expect(conditionalFooPlugin.isEnabled).toBe(false);
  });
});

test(`throws error when invoked before it's available`, () => {
  const config = createMockConfig({ 'xpack.fooPlugin.enabled': true });
  const conditionalFooPlugin = createOptionalPlugin<FooPlugin>(
    config,
    'xpack.fooPlugin',
    {},
    'fooPlugin'
  );
  expect(() => conditionalFooPlugin.aProp).toThrowErrorMatchingSnapshot();
  expect(() => conditionalFooPlugin.aMethod()).toThrowErrorMatchingSnapshot();
  expect(() => conditionalFooPlugin.aField).toThrowErrorMatchingSnapshot();
});

test(`throws error when invoked when it's not enabled`, () => {
  const config = createMockConfig({ 'xpack.fooPlugin.enabled': false });
  const conditionalFooPlugin = createOptionalPlugin<FooPlugin>(
    config,
    'xpack.fooPlugin',
    {},
    'fooPlugin'
  );
  expect(() => conditionalFooPlugin.aProp).toThrowErrorMatchingSnapshot();
  expect(() => conditionalFooPlugin.aMethod()).toThrowErrorMatchingSnapshot();
  expect(() => conditionalFooPlugin.aField).toThrowErrorMatchingSnapshot();
});

test(`behaves normally when it's enabled and available`, () => {
  const config = createMockConfig({ 'xpack.fooPlugin.enabled': false });
  const conditionalFooPlugin = createOptionalPlugin<FooPlugin>(
    config,
    'xpack.fooPlugin',
    {
      fooPlugin: new FooPlugin(),
    },
    'fooPlugin'
  );
  expect(conditionalFooPlugin.aProp).toBe('a prop');
  expect(conditionalFooPlugin.aMethod()).toBe('a method');
  expect(conditionalFooPlugin.aField).toBe('a field');
});
