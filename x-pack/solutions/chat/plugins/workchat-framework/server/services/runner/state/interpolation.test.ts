/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowState } from '@kbn/wc-framework-types-server';
import { interpolateValue } from './interpolation';
import { createEmptyState } from '../workflows/utils/workflow_state';

describe('interpolateValue', () => {
  let state: WorkflowState;

  beforeEach(() => {
    state = createEmptyState();
    state.set('userQuery', 'What is ELSER?');
    state.set('systemPrompt', 'You are a helpful assistant.');
    state.set('searchSize', 10);
    state.set('isValid', true);
    state.set('nestedValue', { deepKey: 'deepValue' });
    state.set('arrayValue', [1, 'two', { three: 3 }]);
  });

  it('should return the original config if no interpolation is needed', () => {
    const config = {
      field1: 'value1',
      field2: 123,
      field3: true,
      field4: null,
      field5: undefined,
    };
    const originalConfig = JSON.parse(JSON.stringify(config));
    const result = interpolateValue(config, state);
    expect(result).toEqual(config);
    expect(config).toEqual(originalConfig); // Ensure original config is unchanged
  });

  it('should interpolate exact matches "{key}"', () => {
    const config = {
      query: '{userQuery}',
      size: '{searchSize}',
      valid: '{isValid}',
      nested: '{nestedValue}',
      arr: '{arrayValue}',
    };
    const originalConfig = JSON.parse(JSON.stringify(config));
    const result = interpolateValue(config, state);
    expect(result).toEqual({
      query: 'What is ELSER?',
      size: 10,
      valid: true,
      nested: { deepKey: 'deepValue' },
      arr: [1, 'two', { three: 3 }],
    });
    expect(config).toEqual(originalConfig);
  });

  it('should interpolate string templates like "text {key} text"', () => {
    const config = {
      prompt: 'User asked: {userQuery}. Respond as: {systemPrompt}',
      info: 'Search size is {searchSize} and validity is {isValid}.',
    };
    const originalConfig = JSON.parse(JSON.stringify(config));
    const result = interpolateValue(config, state);
    expect(result).toEqual({
      prompt: 'User asked: What is ELSER?. Respond as: You are a helpful assistant.',
      info: 'Search size is 10 and validity is true.',
    });
    expect(config).toEqual(originalConfig);
  });

  it('should handle non-existent keys by leaving placeholders', () => {
    const config = {
      exactMiss: '{missingKey}',
      templateMiss: 'Value is {anotherMissingKey}.',
      mixed: 'This {userQuery} exists, but {thisKeyDoesNotExist} does not.',
    };
    const originalConfig = JSON.parse(JSON.stringify(config));
    const result = interpolateValue(config, state);
    expect(result).toEqual({
      exactMiss: '{missingKey}',
      templateMiss: 'Value is {anotherMissingKey}.',
      mixed: 'This What is ELSER? exists, but {thisKeyDoesNotExist} does not.',
    });
    expect(config).toEqual(originalConfig);
  });

  it('should interpolate deeply nested objects', () => {
    const config = {
      level1: {
        level2: {
          prompt: '{systemPrompt}',
          query: 'Search for {userQuery}',
        },
        value: 123,
        template: 'Size is {searchSize}.',
      },
    };
    const originalConfig = JSON.parse(JSON.stringify(config));
    const result = interpolateValue(config, state);
    expect(result).toEqual({
      level1: {
        level2: {
          prompt: 'You are a helpful assistant.',
          query: 'Search for What is ELSER?',
        },
        value: 123,
        template: 'Size is 10.',
      },
    });
    expect(config).toEqual(originalConfig);
  });

  it('should interpolate values within arrays', () => {
    const config = {
      queries: ['{userQuery}', 'Another query', '{missingKey}'],
      details: [
        { type: 'prompt', value: '{systemPrompt}' },
        { type: 'size', value: 'Size: {searchSize}' },
        { type: 'validity', value: '{isValid}' },
      ],
      primitiveArray: [1, '{searchSize}', true, '{isValid}', null],
    };
    const originalConfig = JSON.parse(JSON.stringify(config));
    const result = interpolateValue(config, state);
    expect(result).toEqual({
      queries: ['What is ELSER?', 'Another query', '{missingKey}'],
      details: [
        { type: 'prompt', value: 'You are a helpful assistant.' },
        { type: 'size', value: 'Size: 10' },
        { type: 'validity', value: true },
      ],
      primitiveArray: [1, 10, true, true, null],
    });
    expect(config).toEqual(originalConfig);
  });

  it('should handle mixed interpolation types correctly', () => {
    const config = {
      exact: '{userQuery}',
      template: 'Prompt: {systemPrompt}',
      nested: {
        exact: '{searchSize}',
        template: 'Is valid: {isValid}',
        array: ['{userQuery}', { deep: '{systemPrompt}' }],
      },
      array: ['{isValid}', 100, 'Size: {searchSize}'],
      primitive: 99,
      missing: '{notFound}',
    };
    const originalConfig = JSON.parse(JSON.stringify(config));
    const result = interpolateValue(config, state);
    expect(result).toEqual({
      exact: 'What is ELSER?',
      template: 'Prompt: You are a helpful assistant.',
      nested: {
        exact: 10,
        template: 'Is valid: true',
        array: ['What is ELSER?', { deep: 'You are a helpful assistant.' }],
      },
      array: [true, 100, 'Size: 10'],
      primitive: 99,
      missing: '{notFound}',
    });
    expect(config).toEqual(originalConfig);
  });

  it('should not recurse into non-basic objects like Date', () => {
    const now = new Date();
    const regex = /pattern/g;
    class CustomClass {
      constructor(public value: string) {}
    }
    const customInstance = new CustomClass('test');

    const config = {
      dateField: now,
      regexField: regex,
      customInstanceField: customInstance,
      nested: {
        date: now,
        regex,
        custom: customInstance,
      },
      arrayWithNonBasic: [now, regex, customInstance, { dateInside: now }],
    };

    const originalConfig = JSON.parse(JSON.stringify(config)); // Note: This won't preserve Date, Regex, CustomClass correctly, used for simple structure check
    const result = interpolateValue(config, state);

    // Expect the non-basic objects to be identical (same instance)
    expect(result.dateField).toBe(now);
    expect(result.regexField).toBe(regex);
    expect(result.customInstanceField).toBe(customInstance);
    expect(result.nested.date).toBe(now);
    expect(result.nested.regex).toBe(regex);
    expect(result.nested.custom).toBe(customInstance);
    expect(result.arrayWithNonBasic[0]).toBe(now);
    expect(result.arrayWithNonBasic[1]).toBe(regex);
    expect(result.arrayWithNonBasic[2]).toBe(customInstance);
    expect(result.arrayWithNonBasic[3]).toEqual({ dateInside: now }); // The object containing the date is plain, so it's recreated
    expect((result.arrayWithNonBasic[3] as any).dateInside).toBe(now);

    // Check original config structure integrity (though values might differ due to JSON.stringify limitations)
    expect(Object.keys(config)).toEqual(Object.keys(originalConfig));
    expect(Object.keys(config.nested)).toEqual(Object.keys(originalConfig.nested));
  });
});
