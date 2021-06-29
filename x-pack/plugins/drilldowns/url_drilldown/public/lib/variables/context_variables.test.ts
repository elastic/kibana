/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getContextScopeValues } from './context_variables';
import { TestEmbeddable } from '../test/data';

describe('getContextScopeValues()', () => {
  test('returns only ID for empty embeddable', () => {
    const embeddable = new TestEmbeddable(
      {
        id: 'test',
      },
      {}
    );
    const vars = getContextScopeValues({ embeddable });

    expect(vars).toEqual({
      panel: {
        id: 'test',
      },
    });
  });

  test('returns title as specified in input', () => {
    const embeddable = new TestEmbeddable(
      {
        id: 'test',
        title: 'title1',
      },
      {}
    );
    const vars = getContextScopeValues({ embeddable });

    expect(vars).toEqual({
      panel: {
        id: 'test',
        title: 'title1',
      },
    });
  });

  test('returns output title if input and output titles are specified', () => {
    const embeddable = new TestEmbeddable(
      {
        id: 'test',
        title: 'title1',
      },
      {
        title: 'title2',
      }
    );
    const vars = getContextScopeValues({ embeddable });

    expect(vars).toEqual({
      panel: {
        id: 'test',
        title: 'title2',
      },
    });
  });

  test('returns title from output if title in input is missing', () => {
    const embeddable = new TestEmbeddable(
      {
        id: 'test',
      },
      {
        title: 'title2',
      }
    );
    const vars = getContextScopeValues({ embeddable });

    expect(vars).toEqual({
      panel: {
        id: 'test',
        title: 'title2',
      },
    });
  });

  test('returns saved object ID from output', () => {
    const embeddable = new TestEmbeddable(
      {
        id: 'test',
        savedObjectId: '5678',
      },
      {
        savedObjectId: '1234',
      }
    );
    const vars = getContextScopeValues({ embeddable });

    expect(vars).toEqual({
      panel: {
        id: 'test',
        savedObjectId: '1234',
      },
    });
  });

  test('returns saved object ID from input if it is not set on output', () => {
    const embeddable = new TestEmbeddable(
      {
        id: 'test',
        savedObjectId: '5678',
      },
      {}
    );
    const vars = getContextScopeValues({ embeddable });

    expect(vars).toEqual({
      panel: {
        id: 'test',
        savedObjectId: '5678',
      },
    });
  });

  test('returns query, timeRange and filters from input', () => {
    const embeddable = new TestEmbeddable(
      {
        id: 'test',
        query: {
          language: 'C++',
          query: 'std::cout << 123;',
        },
        timeRange: {
          from: 'FROM',
          to: 'TO',
        },
        filters: [
          {
            meta: {
              alias: 'asdf',
              disabled: false,
              negate: false,
            },
          },
        ],
      },
      {}
    );
    const vars = getContextScopeValues({ embeddable });

    expect(vars).toEqual({
      panel: {
        id: 'test',
        query: {
          language: 'C++',
          query: 'std::cout << 123;',
        },
        timeRange: {
          from: 'FROM',
          to: 'TO',
        },
        filters: [
          {
            meta: {
              alias: 'asdf',
              disabled: false,
              negate: false,
            },
          },
        ],
      },
    });
  });

  test('returns a single index pattern from output', () => {
    const embeddable = new TestEmbeddable(
      {
        id: 'test',
      },
      {
        indexPatterns: [{ id: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' }],
      }
    );
    const vars = getContextScopeValues({ embeddable });

    expect(vars).toEqual({
      panel: {
        id: 'test',
        indexPatternId: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
      },
    });
  });

  test('returns multiple index patterns from output', () => {
    const embeddable = new TestEmbeddable(
      {
        id: 'test',
      },
      {
        indexPatterns: [
          { id: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' },
          { id: 'yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy' },
        ],
      }
    );
    const vars = getContextScopeValues({ embeddable });

    expect(vars).toEqual({
      panel: {
        id: 'test',
        indexPatternIds: [
          'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
          'yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy',
        ],
      },
    });
  });
});
