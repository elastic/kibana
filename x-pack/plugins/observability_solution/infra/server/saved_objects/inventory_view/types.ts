/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inRangeRt, isoToEpochRt, nonEmptyStringRt } from '@kbn/io-ts-utils';
import * as rt from 'io-ts';
import { ItemTypeRT } from '@kbn/metrics-data-access-plugin/common';

export const inventorySavedObjectColorPaletteRT = rt.keyof({
  status: null,
  temperature: null,
  cool: null,
  warm: null,
  positive: null,
  negative: null,
});

const inventorySavedObjectLegendOptionsRT = rt.type({
  palette: inventorySavedObjectColorPaletteRT,
  steps: inRangeRt(2, 18),
  reverseColors: rt.boolean,
});

export const inventorySavedObjectSortOptionRT = rt.type({
  by: rt.keyof({ name: null, value: null }),
  direction: rt.keyof({ asc: null, desc: null }),
});

export const inventorySavedObjectViewOptionsRT = rt.keyof({ table: null, map: null });

export const inventorySabedObjectMapBoundsRT = rt.type({
  min: inRangeRt(0, 1),
  max: inRangeRt(0, 1),
});

export const inventorySavedObjectFiltersStateRT = rt.type({
  kind: rt.literal('kuery'),
  expression: rt.string,
});

export const inventorySavedObjectOptionsStateRT = rt.intersection([
  rt.type({
    accountId: rt.string,
    autoBounds: rt.boolean,
    boundsOverride: inventorySabedObjectMapBoundsRT,
    customMetrics: rt.UnknownArray,
    customOptions: rt.array(
      rt.type({
        text: rt.string,
        field: rt.string,
      })
    ),
    groupBy: rt.UnknownArray,
    metric: rt.UnknownRecord,
    nodeType: ItemTypeRT,
    region: rt.string,
    sort: inventorySavedObjectSortOptionRT,
    view: inventorySavedObjectViewOptionsRT,
  }),
  rt.partial({
    legend: inventorySavedObjectLegendOptionsRT,
    source: rt.string,
    timelineOpen: rt.boolean,
  }),
]);

export const inventoryViewSavedObjectAttributesRT = rt.intersection([
  inventorySavedObjectOptionsStateRT,
  rt.type({
    name: nonEmptyStringRt,
    autoReload: rt.boolean,
    filterQuery: inventorySavedObjectFiltersStateRT,
  }),
  rt.partial({ time: rt.number, isDefault: rt.boolean, isStatic: rt.boolean }),
]);

export const inventoryViewSavedObjectRT = rt.intersection([
  rt.type({
    id: rt.string,
    attributes: inventoryViewSavedObjectAttributesRT,
  }),
  rt.partial({
    version: rt.string,
    updated_at: isoToEpochRt,
  }),
]);

export type InventoryViewSavedObject = rt.TypeOf<typeof inventoryViewSavedObjectRT>;
