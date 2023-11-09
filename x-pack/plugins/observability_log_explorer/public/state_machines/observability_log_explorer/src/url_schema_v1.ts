/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ControlPanelRT, datasetSelectionFromUrlRT } from '@kbn/log-explorer-plugin/common';
import * as rt from 'io-ts';

export const columnRT = rt.union([
  rt.type({
    field: rt.string,
  }),
  rt.partial({
    width: rt.number,
  }),
]);

export const columnsRT = rt.array(columnRT);

export const filterMetaRT = rt.partial({
  alias: rt.union([rt.string, rt.null]),
  disabled: rt.boolean,
  negate: rt.boolean,
  controlledBy: rt.string,
  group: rt.string,
  index: rt.string,
  isMultiIndex: rt.boolean,
  type: rt.string,
  key: rt.string,
  params: rt.any,
  value: rt.any,
});

export const filterRT = rt.intersection([
  rt.type({
    meta: filterMetaRT,
  }),
  rt.partial({
    query: rt.UnknownRecord,
  }),
]);

export const filtersRT = rt.array(filterRT);

const queryRT = rt.union([
  rt.strict({
    language: rt.string,
    query: rt.union([rt.string, rt.record(rt.string, rt.unknown)]),
  }),
  rt.strict({
    sql: rt.string,
  }),
  rt.strict({
    esql: rt.string,
  }),
]);

const timeRangeRT = rt.strict({
  from: rt.string,
  to: rt.string,
});

const refreshIntervalRT = rt.strict({
  pause: rt.boolean,
  value: rt.number,
});

export const urlSchemaRT = rt.partial({
  v: rt.literal(1),
  query: queryRT,
  filters: filtersRT,
  time: timeRangeRT,
  refreshInterval: refreshIntervalRT,
  columns: columnsRT,
  datasetSelection: datasetSelectionFromUrlRT,
  controlPanels: ControlPanelRT,
});

export type UrlSchema = rt.TypeOf<typeof urlSchemaRT>;
