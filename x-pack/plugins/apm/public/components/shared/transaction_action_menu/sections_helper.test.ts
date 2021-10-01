/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { getNonEmptySections } from './sections_helper';

describe('getNonEmptySections', () => {
  it('returns empty when no section is available', () => {
    expect(getNonEmptySections({})).toEqual([]);
  });
  it("returns empty when section doesn't have actions", () => {
    expect(
      getNonEmptySections({
        foo: [
          {
            key: 'foo',
            title: 'Foo',
            subtitle: 'Foo bar',
            actions: [],
          },
        ],
      })
    ).toEqual([]);
  });

  it('returns only sections with actions with condition true', () => {
    expect(
      getNonEmptySections({
        foo: [
          {
            key: 'foo',
            title: 'Foo',
            subtitle: 'Foo bar',
            actions: [],
          },
        ],
        bar: [
          {
            key: 'bar',
            title: 'Bar',
            subtitle: 'Bar foo',
            actions: [
              {
                key: 'bar_action',
                label: 'Bar Action',
                condition: true,
              },
              {
                key: 'bar_action_2',
                label: 'Bar Action 2',
                condition: false,
              },
            ],
          },
        ],
      })
    ).toEqual([
      [
        {
          key: 'bar',
          title: 'Bar',
          subtitle: 'Bar foo',
          actions: [
            {
              key: 'bar_action',
              label: 'Bar Action',
              condition: true,
            },
          ],
        },
      ],
    ]);
  });
});
