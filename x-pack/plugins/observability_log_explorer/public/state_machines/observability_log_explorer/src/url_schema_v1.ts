/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogExplorerPublicStateUpdate } from '@kbn/log-explorer-plugin/public';
import * as rt from 'io-ts';
import { deepCompactObject } from '../../../utils/deep_compact_object';

export const columnRT = rt.intersection([
  rt.strict({
    field: rt.string,
  }),
  rt.exact(
    rt.partial({
      width: rt.number,
    })
  ),
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
  rt.strict({
    meta: filterMetaRT,
  }),
  rt.exact(
    rt.partial({
      query: rt.UnknownRecord,
    })
  ),
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

export const urlSchemaRT = rt.exact(
  rt.partial({
    v: rt.literal(1),
    query: queryRT,
    filters: filtersRT,
    time: timeRangeRT,
    refreshInterval: refreshIntervalRT,
    columns: columnsRT,
    breakdownField: rt.union([rt.string, rt.null]),
    // datasetSelection: datasetSelectionFromUrlRT,
    // controlPanels: ControlPanelRT,
  })
);

export type UrlSchema = rt.TypeOf<typeof urlSchemaRT>;

export const getStateFromUrlValue = (urlValue: UrlSchema): LogExplorerPublicStateUpdate =>
  deepCompactObject<LogExplorerPublicStateUpdate>({
    chart: {
      breakdownField: urlValue.breakdownField,
    },
    filters: urlValue.filters,
    grid: {
      columns: urlValue.columns,
      // TODO
      // rows: {
      //   rowHeight: urlValue.rowHeight,
      //   rowsPerPage: urlValue.rowsPerPage,
      // }
    },
    query: urlValue.query,
    refreshInterval: urlValue.refreshInterval,
    time: urlValue.time,
  });

export const getUrlValueFromState = (state: LogExplorerPublicStateUpdate): UrlSchema =>
  deepCompactObject<UrlSchema>({
    breakdownField: state.chart?.breakdownField,
    columns: state.grid?.columns,
    filters: state.filters,
    query: state.query,
    refreshInterval: state.refreshInterval,
    // TODO: add other fields
    time: state.time,
    v: 1,
  });

const stateFromUrlSchemaRT = new rt.Type<LogExplorerPublicStateUpdate, UrlSchema, UrlSchema>(
  'stateFromUrlSchemaRT',
  rt.never.is,
  (urlSchema, context) => rt.success(getStateFromUrlValue(urlSchema)),
  getUrlValueFromState
);

export const stateFromUntrustedUrlRT = urlSchemaRT.pipe(stateFromUrlSchemaRT);
