/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { LogFormatDetectionState } from '../../types';
import type { LogDetectionNodeParams } from './types';
import { createJSONInput } from '../../util';
import { createCSVProcessor, createDropProcessor } from '../../util/processors';
import { CSVParseError, UnparseableCSVFormatError } from '../../lib/errors/unparseable_csv_error';

// We will only create the processor for the first MAX_CSV_COLUMNS columns.
const MAX_CSV_COLUMNS = 100;

// Estimates from above the number of columns in the CSV samples.
export function upperBoundForColumnCount(csvSamples: string[]): number {
  return Math.max(0, ...csvSamples.map((sample) => sample.split(',').length));
}

// Generates a list of temporary column names.
export function generateColumnNames(count: number): string[] {
  return Array.from({ length: count }).map((_, i) => `column${i + 1}`);
}

// Converts a column name into a safe one to use in the `if ctx...` clause.
// Result must pass rules at https://www.elastic.co/guide/en/elasticsearch/painless/8.15/painless-identifiers.html
export function toSafeColumnName(columnName: unknown): string | undefined {
  if (typeof columnName === 'number') {
    return `Column${columnName}`;
  }
  if (typeof columnName !== 'string') {
    return undefined;
  }
  if (columnName.length === 0) {
    return undefined;
  }
  const safeName = columnName.replace(/[^a-zA-Z0-9_]/g, '_');
  return /^[0-9]/.test(safeName) ? `Column${safeName}` : safeName;
}

// Returns the column list from a header row. We skip values that are not strings.
export function columnsFromHeader(
  tempColumnNames: string[],
  headerObject: { [key: string]: unknown }
): Array<string | undefined> {
  const maxIndex = tempColumnNames.findLastIndex(
    (columnName) => headerObject[columnName] !== undefined
  );
  return tempColumnNames
    .slice(0, maxIndex + 1)
    .map((columnName) => headerObject[columnName])
    .map(toSafeColumnName);
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

/**
 * Generates a list of unique column names based on preferred and fallback names.
 *
 * @generator
 * @param {number} count - The number of unique column names to generate.
 * @param {Array<Array<string | undefined>>} preferredNames - A 2D array where each sub-array contains a list of names.
 * @param {string[]} fallbackNames - An array of fallback names to use if no preferred name is defined.
 * @yields {string} - A list of column names, such that no two are the same.
 */
function* yieldUniqueColumnNames(
  count: number,
  preferredNames: Array<Array<string | undefined>>,
  fallbackNames: string[]
): Generator<string, void> {
  const knownNames = new Set<string>();

  for (let i = 0; i < count; i++) {
    let selectedName: string = fallbackNames[i];

    for (const nameList of preferredNames) {
      const name = nameList[i];
      if (name) {
        selectedName = name;
        break;
      }
    }

    let postfixString = '';

    if (knownNames.has(selectedName)) {
      for (let postfix = 2; ; postfix++) {
        postfixString = `_${postfix}`;
        if (!knownNames.has(selectedName + postfixString)) {
          break;
        }
      }
    }

    selectedName += postfixString;
    knownNames.add(selectedName);
    yield selectedName;
  }
}

// Converts CSV samples into JSON samples.
export async function handleCSV({
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
    [temporaryProcessor],
    samples,
    client
  );

  if (tempErrors.length > 0) {
    throw new UnparseableCSVFormatError(tempErrors as CSVParseError[]);
  }

  const headerColumns = state.samplesFormat.header
    ? columnsFromHeader(temporaryColumns, tempResults[0])
    : [];
  const llmProvidedColumns = (state.samplesFormat.columns || []).map(toSafeColumnName);
  const needColumns = totalColumnCount(temporaryColumns, tempResults);
  const columns: string[] = Array.from(
    yieldUniqueColumnNames(needColumns, [llmProvidedColumns, headerColumns], temporaryColumns)
  );

  const prefix = [packageName, dataStreamName];
  const prefixedColumns = prefixColumns(columns, prefix);
  const csvProcessor = createCSVProcessor('message', prefixedColumns);
  const csvHandlingProcessors = [csvProcessor];

  if (headerColumns.length > 0) {
    const dropValues = columns.reduce((acc, column, index) => {
      if (headerColumns[index] !== undefined) {
        acc[column] = String(headerColumns[index]);
      }
      return acc;
    }, {} as Record<string, string>);
    const dropProcessor = createDropProcessor(
      dropValues,
      prefix,
      'remove_csv_header',
      'Remove the CSV header line by comparing the values'
    );
    csvHandlingProcessors.push(dropProcessor);
  }

  const { pipelineResults: finalResults, errors: finalErrors } = await createJSONInput(
    csvHandlingProcessors,
    samples,
    client
  );

  if (finalErrors.length > 0) {
    throw new UnparseableCSVFormatError(finalErrors as CSVParseError[]);
  }

  // Converts JSON Object into a string and parses it as a array of JSON strings
  const jsonSamples = finalResults
    .map((log) => log[packageName])
    .map((log) => (log as Record<string, unknown>)[dataStreamName])
    .map((log) => JSON.stringify(log));

  return {
    jsonSamples,
    additionalProcessors: [...state.additionalProcessors, ...csvHandlingProcessors],
    lastExecutedChain: 'handleCSV',
  };
}
