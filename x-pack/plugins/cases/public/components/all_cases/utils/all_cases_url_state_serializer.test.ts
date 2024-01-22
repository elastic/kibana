/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CustomFieldTypes } from '../../../../common/types/domain';
import { DEFAULT_QUERY_PARAMS, DEFAULT_FILTER_OPTIONS } from '../../../containers/constants';

import { allCasesUrlStateSerializer } from './all_cases_url_state_serializer';

describe('allCasesUrlStateSerializer', () => {
  it('serializes correctly with default values', () => {
    expect(
      allCasesUrlStateSerializer({
        filterOptions: DEFAULT_FILTER_OPTIONS,
        queryParams: DEFAULT_QUERY_PARAMS,
      })
    ).toMatchInlineSnapshot(`
      Object {
        "page": Array [
          "1",
        ],
        "perPage": Array [
          "10",
        ],
        "sortField": Array [
          "createdAt",
        ],
        "sortOrder": Array [
          "desc",
        ],
      }
    `);
  });

  it('serializes custom fields correctly', () => {
    expect(
      allCasesUrlStateSerializer({
        filterOptions: {
          ...DEFAULT_FILTER_OPTIONS,
          customFields: {
            foo: { type: CustomFieldTypes.TEXT, options: ['bar'] },
            bar: { type: CustomFieldTypes.TEXT, options: ['foo'] },
          },
        },
        queryParams: DEFAULT_QUERY_PARAMS,
      })
    ).toMatchInlineSnapshot(`
      Object {
        "cf_bar": Array [
          "foo",
        ],
        "cf_foo": Array [
          "bar",
        ],
        "page": Array [
          "1",
        ],
        "perPage": Array [
          "10",
        ],
        "sortField": Array [
          "createdAt",
        ],
        "sortOrder": Array [
          "desc",
        ],
      }
    `);
  });

  it('removes unsupported filter options', () => {
    expect(
      allCasesUrlStateSerializer({
        filterOptions: {
          ...DEFAULT_FILTER_OPTIONS,
          searchFields: ['title'],
          reporters: [{ username: 'elastic', email: null, full_name: null }],
          owner: ['cases'],
        },
        queryParams: DEFAULT_QUERY_PARAMS,
      })
    ).toMatchInlineSnapshot(`
      Object {
        "page": Array [
          "1",
        ],
        "perPage": Array [
          "10",
        ],
        "sortField": Array [
          "createdAt",
        ],
        "sortOrder": Array [
          "desc",
        ],
      }
    `);
  });

  it('converts page & perPage to string correctly', () => {
    expect(
      allCasesUrlStateSerializer({
        filterOptions: DEFAULT_FILTER_OPTIONS,
        queryParams: { ...DEFAULT_QUERY_PARAMS, page: 3, perPage: 20 },
      })
    ).toMatchInlineSnapshot(`
      Object {
        "page": Array [
          "3",
        ],
        "perPage": Array [
          "20",
        ],
        "sortField": Array [
          "createdAt",
        ],
        "sortOrder": Array [
          "desc",
        ],
      }
    `);
  });

  it('removes empty values', () => {
    expect(
      allCasesUrlStateSerializer({
        filterOptions: { ...DEFAULT_FILTER_OPTIONS, status: [], search: '', customFields: {} },
        queryParams: DEFAULT_QUERY_PARAMS,
      })
    ).toMatchInlineSnapshot(`
      Object {
        "page": Array [
          "1",
        ],
        "perPage": Array [
          "10",
        ],
        "sortField": Array [
          "createdAt",
        ],
        "sortOrder": Array [
          "desc",
        ],
      }
    `);
  });

  it('converts values to array correctly', () => {
    expect(
      allCasesUrlStateSerializer({
        filterOptions: {
          ...DEFAULT_FILTER_OPTIONS,
          assignees: ['elastic'],
          search: 'title',
        },
        queryParams: DEFAULT_QUERY_PARAMS,
      })
    ).toMatchInlineSnapshot(`
      Object {
        "assignees": Array [
          "elastic",
        ],
        "page": Array [
          "1",
        ],
        "perPage": Array [
          "10",
        ],
        "search": Array [
          "title",
        ],
        "sortField": Array [
          "createdAt",
        ],
        "sortOrder": Array [
          "desc",
        ],
      }
    `);
  });
});
