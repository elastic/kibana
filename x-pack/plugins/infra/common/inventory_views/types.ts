/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isoToEpochRt, nonEmptyStringRt } from '@kbn/io-ts-utils';
import * as rt from 'io-ts';
import { SnapshotCustomMetricInputRT, SnapshotGroupByRT, SnapshotMetricInputRT } from '../http_api';
import { ItemTypeRT } from '../inventory_models/types';

export const inventoryColorPaletteRT = rt.union([
  rt.literal('status'),
  rt.literal('temperature'),
  rt.literal('cool'),
  rt.literal('warm'),
  rt.literal('positive'),
  rt.literal('negative'),
]);

const inventoryLegendOptionsRT = rt.type({
  palette: inventoryColorPaletteRT,
  steps: rt.number,
  reverseColors: rt.boolean,
});

export type InventoryLegendOptions = rt.TypeOf<typeof inventoryLegendOptionsRT>;

export const inventorySortOptionRT = rt.type({
  by: rt.keyof({ name: null, value: null }),
  direction: rt.keyof({ asc: null, desc: null }),
});

export const inventoryMapBounds = rt.type({
  min: rt.number,
  max: rt.number,
});

export const InventoryFiltersStateRT = rt.type({
  kind: rt.literal('kuery'),
  expression: rt.string,
});

export const inventoryOptionsStateRT = rt.intersection([
  rt.type({
    accountId: rt.string,
    autoBounds: rt.boolean,
    boundsOverride: inventoryMapBounds,
    customMetrics: rt.array(SnapshotCustomMetricInputRT),
    customOptions: rt.array(
      rt.type({
        text: rt.string,
        field: rt.string,
      })
    ),
    groupBy: SnapshotGroupByRT,
    metric: SnapshotMetricInputRT,
    nodeType: ItemTypeRT,
    region: rt.string,
    sort: inventorySortOptionRT,
    view: rt.string,
  }),
  rt.partial({ legend: inventoryLegendOptionsRT, source: rt.string, timelineOpen: rt.boolean }),
]);

export const inventoryViewAttributesRT = rt.intersection([
  ...inventoryOptionsStateRT.types,
  rt.strict({
    name: nonEmptyStringRt,
    autoReload: rt.boolean,
    filterQuery: InventoryFiltersStateRT,
    isDefault: rt.boolean,
    isStatic: rt.boolean,
  }),
  rt.partial({ time: isoToEpochRt }),
]);

export const inventoryViewRT = rt.exact(
  rt.intersection([
    rt.type({
      id: rt.string,
      attributes: inventoryViewAttributesRT,
    }),
    rt.partial({
      updatedAt: rt.number,
      version: rt.string,
    }),
  ])
);

export type InventoryColorPalette = rt.TypeOf<typeof inventoryColorPaletteRT>;
export type InventoryMapBounds = rt.TypeOf<typeof inventoryMapBounds>;
export type InventorySortOption = rt.TypeOf<typeof inventorySortOptionRT>;
export type InventoryOptionsState = rt.TypeOf<typeof inventoryOptionsStateRT>;
export type InventoryView = rt.TypeOf<typeof inventoryViewRT>;
export type InventoryViewAttributes = rt.TypeOf<typeof inventoryViewAttributesRT>;
export type InventoryFiltersState = rt.TypeOf<typeof InventoryFiltersStateRT>;
