/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { setupGetConjunctionSuggestions } from './conjunction';
import { QuerySuggestionGetFnArgs, KueryNode } from '../../../../../../../src/plugins/data/public';
import { coreMock } from '../../../../../../../src/core/public/mocks';

const mockKueryNode = (kueryNode: Partial<KueryNode>) => (kueryNode as unknown) as KueryNode;

describe('Kuery conjunction suggestions', () => {
  const querySuggestionsArgs = (null as unknown) as QuerySuggestionGetFnArgs;
  let getSuggestions: ReturnType<typeof setupGetConjunctionSuggestions>;

  beforeEach(() => {
    getSuggestions = setupGetConjunctionSuggestions(coreMock.createSetup());
  });

  test('should return a function', () => {
    expect(typeof getSuggestions).toBe('function');
  });

  test('should not suggest anything for phrases not ending in whitespace', async () => {
    const text = 'foo';
    const suggestions = await getSuggestions(querySuggestionsArgs, mockKueryNode({ text }));

    expect(suggestions).toEqual([]);
  });

  test('should suggest and/or for phrases ending in whitespace', async () => {
    const text = 'foo ';
    const suggestions = await getSuggestions(querySuggestionsArgs, mockKueryNode({ text }));

    expect(suggestions.length).toBe(2);
    expect(suggestions.map((suggestion) => suggestion.text)).toEqual(['and ', 'or ']);
  });

  test('should suggest to insert the suggestion at the end of the string', async () => {
    const text = 'bar ';
    const end = text.length;
    const suggestions = await getSuggestions(querySuggestionsArgs, mockKueryNode({ text, end }));

    expect(suggestions.length).toBe(2);
    expect(suggestions.map((suggestion) => suggestion.start)).toEqual([end, end]);
    expect(suggestions.map((suggestion) => suggestion.end)).toEqual([end, end]);
  });

  test('should have descriptions', async () => {
    const text = ' ';
    const suggestions = await getSuggestions(querySuggestionsArgs, mockKueryNode({ text }));

    expect(typeof suggestions).toBe('object');
    expect(Object.keys(suggestions).length).toBe(2);

    suggestions.forEach((suggestion) => {
      expect(typeof suggestion).toBe('object');
      expect(suggestion).toHaveProperty('description');
    });
  });
});
