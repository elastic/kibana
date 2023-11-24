/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { availableControlsPanels, datasetSelectionPlainRT } from '@kbn/log-explorer-plugin/common';
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

export const optionsListControlRT = rt.strict({
  mode: rt.keyof({
    exclude: null,
    include: null,
  }),
  selection: rt.union([
    rt.strict({
      type: rt.literal('exists'),
    }),
    rt.strict({
      type: rt.literal('options'),
      selectedOptions: rt.array(rt.string),
    }),
  ]),
});

export const controlsRT = rt.exact(
  rt.partial({
    [availableControlsPanels.NAMESPACE]: optionsListControlRT,
  })
);

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
    breakdownField: rt.union([rt.string, rt.null]),
    columns: columnsRT,
    datasetSelection: datasetSelectionPlainRT,
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

export const getStateFromUrlValue = (urlValue: UrlSchema): LogExplorerPublicStateUpdate =>
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

export const getUrlValueFromState = (state: LogExplorerPublicStateUpdate): UrlSchema =>
  deepCompactObject<UrlSchema>({
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

const stateFromUrlSchemaRT = new rt.Type<LogExplorerPublicStateUpdate, UrlSchema, UrlSchema>(
  'stateFromUrlSchemaRT',
  rt.never.is,
  (urlSchema, context) => rt.success(getStateFromUrlValue(urlSchema)),
  getUrlValueFromState
);

export const stateFromUntrustedUrlRT = urlSchemaRT.pipe(stateFromUrlSchemaRT);
