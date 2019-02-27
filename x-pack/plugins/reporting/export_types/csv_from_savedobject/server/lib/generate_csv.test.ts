/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TsvbPanel, TsvbTableData } from '../../types';
import { generateCsv } from './generate_csv';

let mockReq: any;
let mockServer: any;
let mockVisType: string;
let mockPanel: TsvbPanel;

const getMockTableData = (): any => ({
  type: 'table',
  series: [],
});
const getMockServer = (mockTableData: TsvbTableData = getMockTableData()): any => ({
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
  pivot_id: 'year',
  pivot_label: 'Year',
  pivot_rows: 100,
});
const getMockReq = (): any => ({});

describe('Generate CSV from Saved Object ID', () => {
  beforeEach(() => {
    mockVisType = 'metrics'; // TSVB vis type
    mockReq = getMockReq();
    mockServer = getMockServer();
    mockPanel = getMockPanel();
  });

  test('Gets empty CSV from empty Metrics Table Data', async () => {
    const csv = await generateCsv(mockReq, mockServer, mockVisType, mockPanel);
    expect(csv.rows).toMatchInlineSnapshot(`Array []`);
  });

  test('Flattens and converts table data to CSV', async () => {
    const mockTableData = {
      type: 'table',
      series: [
        { series: [{ last: 0, label: 'Count' }], key: '2015' },
        { series: [{ last: 0, label: 'Count' }], key: '2016' },
        { series: [{ last: 32469, label: 'Count' }], key: '2017' },
      ],
    };
    mockServer = getMockServer(mockTableData);
    const csv = await generateCsv(mockReq, mockServer, mockVisType, mockPanel);

    expect(csv.rows).toMatchInlineSnapshot(`
Array [
  "Year,Count",
  "2015,0",
  "2016,0",
  "2017,32469",
]
`);
  });

  test('Flattens and converts multi-column table data to CSV', async () => {
    const mockTableData = {
      type: 'table',
      series: [
        { series: [{ last: 0, label: 'Count' }, { last: 13, label: 'Max' }], key: '2015' },
        { series: [{ last: 0, label: 'Count' }, { last: 26, label: 'Max' }], key: '2016' },
        { series: [{ last: 32469, label: 'Count' }, { last: 39, label: 'Max' }], key: '2017' },
      ],
    };
    mockServer = getMockServer(mockTableData);
    const csv = await generateCsv(mockReq, mockServer, mockVisType, mockPanel);

    expect(csv.rows).toMatchInlineSnapshot(`
Array [
  "Year,Count,Max",
  "2015,0,13",
  "2016,0,26",
  "2017,32469,39",
]
`);
  });
});
