/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { availableControlsPanels, datasetSelectionPlainRT } from '@kbn/log-explorer-plugin/common';
import * as rt from 'io-ts';

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

const timeRangeRT = rt.intersection([
  rt.strict({
    from: rt.string,
    to: rt.string,
  }),
  rt.exact(
    rt.partial({
      mode: rt.keyof({
        absolute: null,
        relative: null,
      }),
    })
  ),
]);

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
