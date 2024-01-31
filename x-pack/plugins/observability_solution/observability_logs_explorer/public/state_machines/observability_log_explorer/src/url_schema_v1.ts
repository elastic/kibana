/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogExplorerPublicStateUpdate } from '@kbn/logs-explorer-plugin/public';
import * as rt from 'io-ts';
import { deepCompactObject, logExplorerUrlSchemaV1 } from '../../../../common';

export const getStateFromUrlValue = (
  urlValue: logExplorerUrlSchemaV1.UrlSchema
): LogExplorerPublicStateUpdate =>
  deepCompactObject<LogExplorerPublicStateUpdate>({
    chart: {
      breakdownField: urlValue.breakdownField,
    },
    controls: urlValue.controls,
    datasetSelection: urlValue.datasetSelection,
    filters: urlValue.filters,
    grid: {
      columns: urlValue.columns,
      rows: {
        rowHeight: urlValue.rowHeight,
        rowsPerPage: urlValue.rowsPerPage,
      },
    },
    query: urlValue.query,
    refreshInterval: urlValue.refreshInterval,
    time: urlValue.time,
  });

export const getUrlValueFromState = (
  state: LogExplorerPublicStateUpdate
): logExplorerUrlSchemaV1.UrlSchema =>
  deepCompactObject<logExplorerUrlSchemaV1.UrlSchema>({
    breakdownField: state.chart?.breakdownField,
    columns: state.grid?.columns,
    controls: state.controls,
    datasetSelection: state.datasetSelection,
    filters: state.filters,
    query: state.query,
    refreshInterval: state.refreshInterval,
    rowHeight: state.grid?.rows?.rowHeight,
    rowsPerPage: state.grid?.rows?.rowsPerPage,
    time: state.time,
    v: 1,
  });

const stateFromUrlSchemaRT = new rt.Type<
  LogExplorerPublicStateUpdate,
  logExplorerUrlSchemaV1.UrlSchema,
  logExplorerUrlSchemaV1.UrlSchema
>(
  'stateFromUrlSchemaRT',
  rt.never.is,
  (urlSchema, context) => rt.success(getStateFromUrlValue(urlSchema)),
  getUrlValueFromState
);

export const stateFromUntrustedUrlRT =
  logExplorerUrlSchemaV1.urlSchemaRT.pipe(stateFromUrlSchemaRT);
