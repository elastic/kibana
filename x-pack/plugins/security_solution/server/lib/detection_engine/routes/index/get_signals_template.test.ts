/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createBackwardsCompatibilityMapping, getSignalsTemplate } from './get_signals_template';

describe('get_signals_template', () => {
  test('it should set the lifecycle "name" and "rollover_alias" to be the name of the index passed in', () => {
    const template = getSignalsTemplate('test-index', '.alerts-security.alerts-space-id');
    expect(template.template.settings).toEqual({
      index: {
        lifecycle: {
          name: 'test-index',
          rollover_alias: 'test-index',
        },
      },
      mapping: {
        total_fields: { limit: 10000 },
      },
    });
  });

  test('it should set have the index patterns with an ending glob in it', () => {
    const template = getSignalsTemplate('test-index', '.alerts-security.alerts-space-id');
    expect(template.index_patterns).toEqual(['test-index-*']);
  });

  test('it should have a mappings section which is an object type', () => {
    const template = getSignalsTemplate('test-index', '.alerts-security.alerts-space-id');
    expect(typeof template.template.mappings).toEqual('object');
  });

  test('it should have a signals section which is an object type', () => {
    const template = getSignalsTemplate('test-index', '.alerts-security.alerts-space-id');
    expect(typeof template.template.mappings.properties.signal).toEqual('object');
  });

  test('it should have a "total_fields" section that is at least 10k in size', () => {
    const template = getSignalsTemplate('test-index', '.alerts-security.alerts-space-id');
    expect(template.template.settings.mapping.total_fields.limit).toBeGreaterThanOrEqual(10000);
  });

  // If you see this test fail, you should track down any and all "constant_keyword" in your ecs_mapping.json and replace
  // those with "keyword". The paths that fail in the array below will be something like:
  // - Expected  - 1
  // + Received  + 5
  //
  // - Array []
  // + Array [
  // +   "mappings.properties.data_stream.properties.dataset",
  // +   "mappings.properties.data_stream.properties.namespace",
  // +   "mappings.properties.data_stream.properties.type",
  // + ]
  // which means that in your ecs_mapping you have paths such as "mappings.properties.data_stream.properties.dataset" which
  // contain a constant_keyword which needs to be replaced with a normal keyword instead.
  //
  // The reason why we deviate from ECS standards here is because when you have a many to 1 relationship where you have
  // several different indexes with different "constant_keyword" values you cannot copy them over into a single "constant_keyword".
  // Instead you have to use "keyword". This test was first introduced when ECS 1.10 came out and data_stream.* values which had
  // "constant_keyword" fields and we needed to change those to be "keyword" instead.
  test('it should NOT have any "constant_keyword" and instead those should be replaced with regular "keyword" in the mapping', () => {
    const template = getSignalsTemplate('test-index', '.alerts-security.alerts-space-id');

    // Small recursive function to find any values of "constant_keyword" and mark which fields it was found on and then error on those fields
    // The matchers from jest such as jest.toMatchObject do not support recursion, so I have to write it here:
    // https://github.com/facebook/jest/issues/2506
    const recursiveConstantKeywordFound = (path: string, inputTemplate: object): string[] =>
      Object.entries(inputTemplate).reduce<string[]>((accum, [key, innerValue]) => {
        if (typeof innerValue === 'object') {
          return [
            ...accum,
            ...recursiveConstantKeywordFound(path !== '' ? `${path}.${key}` : key, innerValue),
          ];
        } else {
          if (key === 'type' && innerValue === 'constant_keyword') {
            return [...accum, path];
          } else {
            return accum;
          }
        }
      }, []);
    const constantKeywordsFound = recursiveConstantKeywordFound('', template);
    expect(constantKeywordsFound).toEqual([]);
    // expect(constantKeywordsFound).toEqual([
    //   'template.mappings.properties.kibana.space_ids',
    //   'template.mappings.properties.kibana.alert.rule.consumer',
    //   'template.mappings.properties.kibana.alert.rule.producer',
    //   'template.mappings.properties.kibana.alert.rule.rule_type_id',
    // ]);
  });

  test('it should match snapshot', () => {
    const template = getSignalsTemplate('test-index', '.alerts-security.alerts-space-id');
    expect(template).toMatchSnapshot();
  });

  test('backwards compatibility mappings for version 45 should match snapshot', () => {
    const mapping = createBackwardsCompatibilityMapping(45);
    expect(mapping).toMatchSnapshot();
  });

  test('backwards compatibility mappings for version 57 should match snapshot', () => {
    const mapping = createBackwardsCompatibilityMapping(57);
    expect(mapping).toMatchSnapshot();
  });
});
