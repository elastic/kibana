/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import { mergeTables } from './merge_tables';
import { ExpressionValueSearchContext } from 'src/plugins/data/public';
import { Datatable, ExecutionContext } from 'src/plugins/expressions';
import { LensInspectorAdapters } from './types';

describe('lens_merge_tables', () => {
  const sampleTable1: Datatable = {
    type: 'datatable',
    columns: [
      { id: 'bucket', name: 'A', meta: { type: 'string' } },
      { id: 'count', name: 'Count', meta: { type: 'number' } },
    ],
    rows: [
      { bucket: 'a', count: 5 },
      { bucket: 'b', count: 10 },
    ],
  };

  const sampleTable2: Datatable = {
    type: 'datatable',
    columns: [
      { id: 'bucket', name: 'C', meta: { type: 'string' } },
      { id: 'avg', name: 'Average', meta: { type: 'number' } },
    ],
    rows: [
      { bucket: 'a', avg: 2.5 },
      { bucket: 'b', avg: 9 },
    ],
  };

  it('should produce a row with the nested table as defined', () => {
    expect(
      mergeTables.fn(
        null,
        { layerIds: ['first', 'second'], tables: [sampleTable1, sampleTable2] },
        // eslint-disable-next-line
        {} as any
      )
    ).toEqual({
      tables: { first: sampleTable1, second: sampleTable2 },
      type: 'lens_multitable',
    });
  });

  it('should store the current tables in the tables inspector', () => {
    const adapters: LensInspectorAdapters = { tables: {} };
    mergeTables.fn(null, { layerIds: ['first', 'second'], tables: [sampleTable1, sampleTable2] }, {
      inspectorAdapters: adapters,
    } as ExecutionContext<LensInspectorAdapters, ExpressionValueSearchContext>);
    expect(adapters.tables!.first).toBe(sampleTable1);
    expect(adapters.tables!.second).toBe(sampleTable2);
  });

  it('should pass the date range along', () => {
    expect(
      mergeTables.fn(
        {
          type: 'kibana_context',
          timeRange: {
            from: '2019-01-01T05:00:00.000Z',
            to: '2020-01-01T05:00:00.000Z',
          },
        },
        { layerIds: ['first', 'second'], tables: [] },
        // eslint-disable-next-line
        {} as any
      )
    ).toMatchInlineSnapshot(`
      Object {
        "dateRange": Object {
          "fromDate": 2019-01-01T05:00:00.000Z,
          "toDate": 2020-01-01T05:00:00.000Z,
        },
        "tables": Object {},
        "type": "lens_multitable",
      }
    `);
  });

  it('should handle this week now/w', () => {
    const { dateRange } = mergeTables.fn(
      {
        type: 'kibana_context',
        timeRange: {
          from: 'now/w',
          to: 'now/w',
        },
      },
      { layerIds: ['first', 'second'], tables: [] },
      // eslint-disable-next-line
      {} as any
    );

    expect(moment.duration(moment().startOf('week').diff(dateRange!.fromDate)).asDays()).toEqual(0);

    expect(moment.duration(moment().endOf('week').diff(dateRange!.toDate)).asDays()).toEqual(0);
  });
});
