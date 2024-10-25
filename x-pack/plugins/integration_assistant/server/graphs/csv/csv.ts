/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { LogFormatDetectionState } from '../../types';
import type { LogDetectionNodeParams } from '../log_type_detection/types';
import { createJSONInput } from '../../util';
import { createCSVProcessor, createDropProcessor } from '../../util/processors';
import { CSVParseError, UnparseableCSVFormatError } from '../../lib/errors/unparseable_csv_error';
import {
  generateColumnNames,
  upperBoundForColumnCount,
  columnsFromHeader,
  toSafeColumnName,
  totalColumnCount,
  yieldUniqueColumnNames,
  prefixColumns,
} from './columns';

// We will only create the processor for the first MAX_CSV_COLUMNS columns.
const MAX_CSV_COLUMNS = 100;

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
