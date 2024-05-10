/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { dataSourceSelectionPlainRT } from '@kbn/logs-explorer-plugin/common';
import * as rt from 'io-ts';
import {
  columnsRT,
  controlsRT,
  filtersRT,
  queryRT,
  refreshIntervalRT,
  timeRangeRT,
} from './url_schema_v1';

export * from './url_schema_v1';

/**
 * The breaking change and only difference between url schema v1 to v2
 * is the renaming of the `datasetSelection` param to `dataSourceSelection`
 * as the selection parameter now represents a wider concept after the support to data views.
 */
export const urlSchemaRT = rt.exact(
  rt.partial({
    v: rt.literal(2),
    breakdownField: rt.union([rt.string, rt.null]),
    columns: columnsRT,
    dataSourceSelection: dataSourceSelectionPlainRT,
    filters: filtersRT,
    query: queryRT,
    refreshInterval: refreshIntervalRT,
    rowHeight: rt.number,
    rowsPerPage: rt.number,
    time: timeRangeRT,
    controls: controlsRT,
  })
);

export type UrlSchema = rt.TypeOf<typeof urlSchemaRT>;
