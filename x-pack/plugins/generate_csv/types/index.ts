/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SerializedSearchSourceFields } from '@kbn/data-plugin/common';
import type { BaseParams, BasePayload } from '@kbn/reporting-plugin/common';

interface BaseParamsCSV {
  searchSource: SerializedSearchSourceFields;
  columns?: string[];
}

export type JobParamsCSV = BaseParamsCSV & BaseParams;
export type TaskPayloadCSV = BaseParamsCSV & BasePayload;

// export CsvConfig =
export const CONTENT_TYPE_CSV = 'text/csv';
export const CSV_REPORTING_ACTION = 'downloadCsvReport';
export const CSV_BOM_CHARS = '\ufeff';
export const CSV_FORMULA_CHARS = ['=', '+', '-', '@'];
export const UI_SETTINGS_CSV_SEPARATOR = 'csv:separator';
export const UI_SETTINGS_CSV_QUOTE_VALUES = 'csv:quoteValues';
