/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';
import { getContextScopeValues } from './context_variables';

describe('getContextScopeValues()', () => {
  test('excludes undefined values', () => {
    const embeddableApi = {};
    expect(getContextScopeValues({ embeddable: embeddableApi })).toEqual({
      panel: {},
    });
  });

  test('returns values when provided', () => {
    const embeddableApi = {
      parentApi: {
        filters$: new BehaviorSubject([
          {
            meta: {
              alias: 'asdf',
              disabled: false,
              negate: false,
            },
          },
        ]),
        query$: new BehaviorSubject({
          language: 'C++',
          query: 'std::cout << 123;',
        }),
        timeRange$: new BehaviorSubject({ from: 'FROM', to: 'TO' }),
      },
      panelTitle: new BehaviorSubject('title1'),
      savedObjectId: new BehaviorSubject('1234'),
      uuid: 'test',
    };
    expect(getContextScopeValues({ embeddable: embeddableApi })).toEqual({
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
        savedObjectId: '1234',
        title: 'title1',
      },
    });
  });

  test('returns a single index pattern from output', () => {
    const embeddableApi = {
      dataViews: new BehaviorSubject([{ id: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' }]),
    };
    expect(getContextScopeValues({ embeddable: embeddableApi })).toEqual({
      panel: {
        indexPatternId: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
      },
    });
  });

  test('returns multiple index patterns from output', () => {
    const embeddableApi = {
      dataViews: new BehaviorSubject([
        { id: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' },
        { id: 'yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy' },
      ]),
    };
    expect(getContextScopeValues({ embeddable: embeddableApi })).toEqual({
      panel: {
        indexPatternIds: [
          'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
          'yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy',
        ],
      },
    });
  });
});
