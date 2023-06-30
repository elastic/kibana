/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isoToEpochRt, nonEmptyStringRt, inRangeRt } from '@kbn/io-ts-utils';
import * as rt from 'io-ts';
import {
  SnapshotCustomMetricInputRT,
  SnapshotGroupByRT,
  SnapshotMetricInputRT,
} from '../http_api/snapshot_api';
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
  steps: inRangeRt(2, 18),
  reverseColors: rt.boolean,
});

export const inventorySortOptionRT = rt.type({
  by: rt.keyof({ name: null, value: null }),
  direction: rt.keyof({ asc: null, desc: null }),
});

export const inventoryViewOptionsRT = rt.keyof({ table: null, map: null });

export const inventoryMapBoundsRT = rt.type({
  min: inRangeRt(0, 1),
  max: inRangeRt(0, 1),
});

export const inventoryFiltersStateRT = rt.type({
  kind: rt.literal('kuery'),
  expression: rt.string,
});

export const inventoryOptionsStateRT = rt.intersection([
  rt.type({
    accountId: rt.string,
    autoBounds: rt.boolean,
    boundsOverride: inventoryMapBoundsRT,
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
    view: inventoryViewOptionsRT,
  }),
  rt.partial({ legend: inventoryLegendOptionsRT, source: rt.string, timelineOpen: rt.boolean }),
]);

export const inventoryViewAttributesRT = rt.intersection([
  inventoryOptionsStateRT,
  rt.type({
    name: nonEmptyStringRt,
    autoReload: rt.boolean,
    filterQuery: inventoryFiltersStateRT,
  }),
  rt.partial({ time: rt.number, isDefault: rt.boolean, isStatic: rt.boolean }),
]);

export const inventoryViewRT = rt.exact(
  rt.intersection([
    rt.type({
      id: rt.string,
      attributes: inventoryViewAttributesRT,
    }),
    rt.partial({
      updatedAt: isoToEpochRt,
      version: rt.string,
    }),
  ])
);

export type InventoryColorPalette = rt.TypeOf<typeof inventoryColorPaletteRT>;
export type InventoryFiltersState = rt.TypeOf<typeof inventoryFiltersStateRT>;
export type InventoryLegendOptions = rt.TypeOf<typeof inventoryLegendOptionsRT>;
export type InventoryMapBounds = rt.TypeOf<typeof inventoryMapBoundsRT>;
export type InventoryOptionsState = rt.TypeOf<typeof inventoryOptionsStateRT>;
export type InventorySortOption = rt.TypeOf<typeof inventorySortOptionRT>;
export type InventoryView = rt.TypeOf<typeof inventoryViewRT>;
export type InventoryViewAttributes = rt.TypeOf<typeof inventoryViewAttributesRT>;
export type InventoryViewOptions = rt.TypeOf<typeof inventoryViewOptionsRT>;
