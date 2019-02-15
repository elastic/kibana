/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { badRequest } from 'boom';
import { Request } from 'hapi';
import { KbnServer } from '../../../../types';
import { TsvbAggregationCell, TsvbAggregationRow, TsvbPanel, TsvbTableData } from '../../types';

export async function generateCsvTsvb(req: Request, server: KbnServer, tsvbPanel: TsvbPanel) {
  const { getTableData: getTableDataTSVB } = server.plugins.metrics; // FIXME: don't crash if config has tsvb disabled
  const tableDataTSVB: TsvbTableData = await getTableDataTSVB(req, tsvbPanel);

  if (!tableDataTSVB) {
    throw new Error('Metrics plugin returned no data for the request!');
  }
  const { type: mtype } = tableDataTSVB;
  if (mtype !== 'table') {
    throw badRequest(
      `The Visual Builder visualization type is required to be [table]. Found: [${mtype}]`
    );
  }

  const dataSet: TsvbAggregationRow[] = tableDataTSVB.series;

  // form the header from the first row's column labels
  let csvRows: string[] = [];
  if (dataSet.length > 0) {
    const csvHeader = [
      tsvbPanel.pivot_label, // first column header: label of the top-level split
      ...dataSet[0].series.map((cell: TsvbAggregationCell) => cell.label), // rest of column headers: labels of each sub-aggregation
    ].join(','); // FIXME use separator from config

    // form all the rows beginning with the header
    csvRows = [
      csvHeader, // header row
      ...dataSet.map(row => {
        // rest of the data
        return [row.key, ...row.series.map((cell: TsvbAggregationCell) => cell.last)].join(',');
      }),
    ];
  }

  return {
    type: 'CSV from Metrics Visualization',
    rows: csvRows,
  };
}
