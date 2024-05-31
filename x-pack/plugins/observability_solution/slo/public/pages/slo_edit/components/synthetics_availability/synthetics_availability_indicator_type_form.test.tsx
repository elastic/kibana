/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { getGroupByCardinalityFilters } from './synthetics_availability_indicator_type_form';

describe('get group by cardinality filters', () => {
  it('formats filters correctly', () => {
    const monitorIds = ['1234'];
    const tags = ['tag1', 'tag2'];
    const projects = ['project1', 'project2'];
    expect(getGroupByCardinalityFilters(monitorIds, projects, tags)).toEqual([
      {
        $state: { store: 'appState' },
        meta: {
          alias: null,
          disabled: false,
          key: 'monitor.id',
          negate: false,
          params: ['1234'],
          type: 'phrases',
        },
        query: {
          bool: { minimum_should_match: 1, should: [{ match_phrase: { 'monitor.id': '1234' } }] },
        },
      },
      {
        $state: { store: 'appState' },
        meta: {
          alias: null,
          disabled: false,
          key: 'monitor.project.id',
          negate: false,
          params: ['project1', 'project2'],
          type: 'phrases',
        },
        query: {
          bool: {
            minimum_should_match: 1,
            should: [
              { match_phrase: { 'monitor.project.id': 'project1' } },
              { match_phrase: { 'monitor.project.id': 'project2' } },
            ],
          },
        },
      },
      {
        $state: { store: 'appState' },
        meta: {
          alias: null,
          disabled: false,
          key: 'tags',
          negate: false,
          params: ['tag1', 'tag2'],
          type: 'phrases',
        },
        query: {
          bool: {
            minimum_should_match: 1,
            should: [{ match_phrase: { tags: 'tag1' } }, { match_phrase: { tags: 'tag2' } }],
          },
        },
      },
    ]);
  });

  it('does not include filters when arrays are empty', () => {
    // @ts-ignore
    const monitorIds = [];
    // @ts-ignore
    const tags = [];
    // @ts-ignore
    const projects = [];
    // @ts-ignore
    expect(getGroupByCardinalityFilters(monitorIds, projects, tags)).toEqual([]);
  });
});
