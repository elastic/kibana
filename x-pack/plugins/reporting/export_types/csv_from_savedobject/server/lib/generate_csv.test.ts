/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TsvbPanel } from '../../types';
import { generateCsv } from './generate_csv';

let mockReq: any;
let mockServer: any;
let mockVisType: string;
let mockPanel: TsvbPanel;

const getMockTableData = (): any => ({
  type: 'table',
  series: [],
});
const getMockServer = (mockTableData = getMockTableData()): any => ({
  plugins: {
    metrics: {
      getTableData: () => mockTableData,
    },
  },
});
const getMockPanel = (): TsvbPanel => ({
  filter: 'name:Ti*',
  id: 'abc123',
  index_pattern: 'logs-*',
  interval: 'auto',
  series: [],
  type: 'table',
  pivot_id: 'Year',
  pivot_label: 'year',
  pivot_rows: 100,
});
const getMockReq = (): any => ({});

describe('Generate CSV from Saved Object ID', () => {
  beforeEach(() => {
    mockVisType = 'metrics';
    mockReq = getMockReq();
    mockServer = getMockServer();
    mockPanel = getMockPanel();
  });

  test('Gets empty CSV from empty Metrics Table Data', async () => {
    const csv = await generateCsv(mockReq, mockServer, mockVisType, mockPanel);
    expect(csv.rows).toMatchInlineSnapshot(`Array []`);
  });

  test('Flattens and converts multi-column table data to CSV', async () => {
    const mockTableData = {
      type: 'table',
      series: [
        { cols: [{ data: 0, label: 'Count' }], term: 2015 },
        { cols: [{ data: 0, label: 'Count' }], term: 2016 },
        { cols: [{ data: 32469, label: 'Count' }], term: 2017 },
      ],
    };
    mockServer = getMockServer(mockTableData);
    const csv = await generateCsv(mockReq, mockServer, mockVisType, mockPanel);

    expect(csv.rows).toMatchInlineSnapshot(`
Array [
  "term,Count",
  "2015,0",
  "2016,0",
  "2017,32469",
]
`);
  });

  test('Flattens and converts table data to CSV', async () => {
    const mockTableData = {
      type: 'table',
      series: [
        { cols: [{ data: 0, label: 'Count' }, { data: 13, label: 'Max' }], term: 2015 },
        { cols: [{ data: 0, label: 'Count' }, { data: 26, label: 'Max' }], term: 2016 },
        { cols: [{ data: 32469, label: 'Count' }, { data: 39, label: 'Max' }], term: 2017 },
      ],
    };
    mockServer = getMockServer(mockTableData);
    const csv = await generateCsv(mockReq, mockServer, mockVisType, mockPanel);

    expect(csv.rows).toMatchInlineSnapshot(`
Array [
  "term,Count,Max",
  "2015,0,13",
  "2016,0,26",
  "2017,32469,39",
]
`);
  });
});
