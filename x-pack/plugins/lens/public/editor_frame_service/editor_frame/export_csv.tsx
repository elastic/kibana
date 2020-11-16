/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// Inspired by the inspector CSV exporter

// @ts-ignore
import { saveAs } from '@elastic/filesaver';
import pMap from 'p-map';

import { FormatFactory } from 'src/plugins/data/common/field_formats/utils';
import { Datatable } from 'src/plugins/expressions';
import { TableInspectorAdapter } from '../types';

const LINE_FEED_CHARACTER = '\r\n';
const nonAlphaNumRE = /[^a-zA-Z0-9]/;
const allDoubleQuoteRE = /"/g;

// TODO: enhance this later on
function escape(val: object | string, quoteValues: boolean) {
  if (val != null && typeof val === 'object') {
    val = val.valueOf();
  }

  val = String(val);

  if (quoteValues && nonAlphaNumRE.test(val)) {
    val = `"${val.replace(allDoubleQuoteRE, '""')}"`;
  }

  return val;
}

interface CSVOptions {
  csvSeparator: string;
  quoteValues: boolean;
  formatFactory: FormatFactory;
}

function buildCSV(
  { columns, rows }: Datatable,
  { csvSeparator, quoteValues, formatFactory }: CSVOptions
) {
  // Build the header row by its names
  const header = columns.map((col) => escape(col.name, quoteValues));

  const formatters = columns.reduce<Record<string, ReturnType<FormatFactory>>>(
    (memo, { id, meta }) => {
      memo[id] = formatFactory(meta?.params);
      return memo;
    },
    {}
  );

  // Convert the array of row objects to an array of row arrays
  const csvRows = rows.map((row) => {
    return columns.map((column) =>
      escape(formatters[column.id].convert(row[column.id]), quoteValues)
    );
  });

  return (
    [header, ...csvRows].map((row) => row.join(csvSeparator)).join(LINE_FEED_CHARACTER) +
    LINE_FEED_CHARACTER
  ); // Add \r\n after last line
}

export function exportAsCSVs(
  filename: string,
  datatables: TableInspectorAdapter = {},
  options: CSVOptions
) {
  // build a csv for datatable layer
  const csvs = Object.keys(datatables)
    .filter((layerId) => {
      return (
        datatables[layerId].columns.length &&
        datatables[layerId].rows.length &&
        datatables[layerId].rows.every((row) => Object.keys(row).length)
      );
    })
    .reduce<Record<string, string>>((memo, layerId) => {
      memo[layerId] = buildCSV(datatables[layerId], options);
      return memo;
    }, {});

  const layerIds = Object.keys(csvs);

  const downloadQueue = layerIds.map((layerId, i) => {
    const blob = new Blob([csvs[layerId]]);
    const postFix = layerIds.length > 1 ? `-${i + 1}` : '';
    // TODO: remove this workaround for multiple files when fixed (in filesaver?)
    return () => Promise.resolve().then(() => saveAs(blob, `${filename}${postFix}.csv`));
  });

  // There's a bug in some browser with multiple files downloaded at once
  // * sometimes only the first/last content is downloaded multiple times
  // * sometimes only the first/last filename is used multiple times
  pMap(downloadQueue, (downloadFn) => Promise.all([downloadFn(), wait(50)]), {
    concurrency: 1,
  });
}
// Probably there's already another one around?
function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
