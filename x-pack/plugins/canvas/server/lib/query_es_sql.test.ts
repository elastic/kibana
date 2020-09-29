/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { zipObject } from 'lodash';
import { queryEsSQL } from './query_es_sql';
// @ts-expect-error
import { buildBoolArray } from './build_bool_array';

const response = {
  columns: [
    { name: 'One', type: 'keyword' },
    { name: 'Two', type: 'keyword' },
  ],
  rows: [
    ['foo', 'bar'],
    ['buz', 'baz'],
  ],
  cursor: 'cursor-value',
};

const baseArgs = {
  count: 1,
  query: 'query',
  filter: [],
  timezone: 'timezone',
};

const getApi = (resp = response) => {
  const api = jest.fn();
  api.mockResolvedValue(resp);
  return api;
};

describe('query_es_sql', () => {
  it('should call the api with the given args', async () => {
    const api = getApi();

    queryEsSQL(api, baseArgs);

    expect(api).toHaveBeenCalled();
    const givenArgs = api.mock.calls[0][1];

    expect(givenArgs.body.fetch_size).toBe(baseArgs.count);
    expect(givenArgs.body.query).toBe(baseArgs.query);
    expect(givenArgs.body.time_zone).toBe(baseArgs.timezone);
  });

  it('formats the response', async () => {
    const api = getApi();

    const result = await queryEsSQL(api, baseArgs);

    const expectedColumns = response.columns.map((c) => ({
      id: c.name,
      name: c.name,
      meta: { type: 'string' },
    }));
    const columnNames = expectedColumns.map((c) => c.name);
    const expectedRows = response.rows.map((r) => zipObject(columnNames, r));

    expect(result.type).toBe('datatable');
    expect(result.columns).toEqual(expectedColumns);
    expect(result.rows).toEqual(expectedRows);
  });

  it('fetches pages until it has the requested count', async () => {
    const pageOne = {
      columns: [
        { name: 'One', type: 'keyword' },
        { name: 'Two', type: 'keyword' },
      ],
      rows: [['foo', 'bar']],
      cursor: 'cursor-value',
    };

    const pageTwo = {
      rows: [['buz', 'baz']],
    };

    const api = getApi(pageOne);
    api.mockReturnValueOnce(pageOne).mockReturnValueOnce(pageTwo);

    const result = await queryEsSQL(api, { ...baseArgs, count: 2 });
    expect(result.rows).toHaveLength(2);
  });

  it('closes any cursors that remain open', async () => {
    const api = getApi();

    await queryEsSQL(api, baseArgs);
    expect(api.mock.calls[1][1].body.cursor).toBe(response.cursor);
  });

  it('throws on errors', async () => {
    const api = getApi();
    api.mockRejectedValueOnce(new Error('parsing_exception'));
    api.mockRejectedValueOnce(new Error('generic es error'));

    expect(queryEsSQL(api, baseArgs)).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Couldn't parse Elasticsearch SQL query. You may need to add double quotes to names containing special characters. Check your query and try again. Error: parsing_exception"`
    );

    expect(queryEsSQL(api, baseArgs)).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Unexpected error from Elasticsearch: generic es error"`
    );
  });
});
