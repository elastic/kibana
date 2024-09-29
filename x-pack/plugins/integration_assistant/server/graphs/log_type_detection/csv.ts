/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { LogFormatDetectionState } from '../../types';
import type { LogDetectionNodeParams } from './types';
import { createJSONInput } from '../../util';
import { createCSVProcessor } from '../../util/processors';

// We will only create the processor for the first MAX_CSV_COLUMNS columns.
const MAX_CSV_COLUMNS = 100;

// Estimates from above the number of columns in the CSV samples.
export function upperBoundForColumnCount(csvSamples: string[]): number {
  return Math.max(0, ...csvSamples.map((sample) => sample.split(',').length));
}

// Generates a list of temporary column names.
export function generateColumnNames(count: number): string[] {
  return Array.from({ length: count }).map((_, i) => `column${i}`);
}

// Returns the column list from a header row. We skip values that are not strings.
export function columnsFromHeader(
  tempColumnNames: string[],
  headerObject: { [key: string]: unknown }
): string[] {
  const maxIndex = tempColumnNames.findLastIndex(
    (columnName) => headerObject[columnName] !== undefined
  );
  return tempColumnNames
    .slice(0, maxIndex + 1)
    .map(
      (columnName) =>
        (typeof headerObject[columnName] === 'string'
          ? headerObject[columnName]
          : columnName) as string
    );
}

// Count the number of columns actually present in the rows.
export function totalColumnCount(
  tempColumnNames: string[],
  csvRows: Array<{ [key: string]: unknown }>
): number {
  return (
    Math.max(
      -1,
      ...csvRows.map((row) =>
        tempColumnNames.findLastIndex((columnName) => row[columnName] !== undefined)
      )
    ) + 1
  );
}

// Prefixes each column with the provided prefixes, separated by a period.
function prefixColumns(columns: string[], prefixes: string[]): string[] {
  return columns.map((column) => [...prefixes, column].join('.'));
}

// Converts CSV samples into JSON samples.
export async function convertCSVSamples({
  state,
  client,
}: LogDetectionNodeParams): Promise<Partial<LogFormatDetectionState>> {
  const packageName = state.packageName;
  const dataStreamName = state.dataStreamName;

  const samples = state.logSamples;
  const temporaryColumns = generateColumnNames(
    Math.min(upperBoundForColumnCount(samples), MAX_CSV_COLUMNS)
  );
  const temporaryProcessor = createCSVProcessor('message', temporaryColumns);

  const { pipelineResults: tempResults, errors: tempErrors } = await createJSONInput(
    temporaryProcessor,
    samples,
    client
  );

  if (tempErrors.length > 0) {
    return { errors: tempErrors, lastExecutedChain: 'convertCSVSamples' };
  }

  const headerColumns = state.header ? columnsFromHeader(temporaryColumns, tempResults[0]) : [];
  const columns = [
    ...headerColumns,
    ...temporaryColumns.slice(
      headerColumns.length,
      totalColumnCount(temporaryColumns, tempResults)
    ),
  ];

  const csvProcessor = createCSVProcessor(
    'message',
    prefixColumns(columns, [packageName, dataStreamName])
  );

  const { pipelineResults: finalResults, errors: finalErrors } = await createJSONInput(
    csvProcessor,
    samples,
    client
  );

  if (finalErrors.length > 0) {
    return { errors: finalErrors, lastExecutedChain: 'convertCSVSamples' };
  }

  // Converts JSON Object into a string and parses it as a array of JSON strings
  const jsonSamples = finalResults
    .map((log) => log[packageName])
    .map((log) => (log as Record<string, unknown>)[dataStreamName])
    .map((log) => JSON.stringify(log));

  return {
    jsonSamples,
    additionalProcessors: [...state.additionalProcessors, csvProcessor],
    lastExecutedChain: 'convertCSVSamples',
  };
}
