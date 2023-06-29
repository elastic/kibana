/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { inRangeRt, nonEmptyStringRt } from '@kbn/io-ts-utils';
import * as rt from 'io-ts';
import { either } from 'fp-ts/Either';
import { ItemTypeRT } from '../../../inventory_models/types';
import { SnapshotMetricInputRT } from '../../snapshot_api';

export const INVENTORY_VIEW_URL = '/api/infra/inventory_views';
export const INVENTORY_VIEW_URL_ENTITY = `${INVENTORY_VIEW_URL}/{inventoryViewId}`;
export const getInventoryViewUrl = (inventoryViewId?: string) =>
  [INVENTORY_VIEW_URL, inventoryViewId].filter(Boolean).join('/');

const inventoryViewIdRT = new rt.Type<string, string, unknown>(
  'InventoryViewId',
  rt.string.is,
  (u, c) =>
    either.chain(rt.string.validate(u, c), (id) => {
      return id === '0'
        ? rt.failure(u, c, `The inventory view with id ${id} is not configurable.`)
        : rt.success(id);
    }),
  String
);

export const inventoryViewRequestParamsRT = rt.type({
  inventoryViewId: inventoryViewIdRT,
});

export const inventoryViewRequestQueryRT = rt.partial({
  sourceId: rt.string,
});

export type InventoryViewRequestQuery = rt.TypeOf<typeof inventoryViewRequestQueryRT>;

const inventoryViewAttributesResponseRT = rt.intersection([
  rt.strict({
    name: nonEmptyStringRt,
    isDefault: rt.boolean,
    isStatic: rt.boolean,
  }),
  rt.UnknownRecord,
]);

const inventoryViewResponseRT = rt.exact(
  rt.intersection([
    rt.type({
      id: rt.string,
      attributes: inventoryViewAttributesResponseRT,
    }),
    rt.partial({
      updatedAt: rt.number,
      version: rt.string,
    }),
  ])
);

export const inventoryViewResponsePayloadRT = rt.type({
  data: inventoryViewResponseRT,
});

const legendRT = rt.type({
  palette: rt.union([
    rt.literal('status'),
    rt.literal('temperature'),
    rt.literal('cool'),
    rt.literal('warm'),
    rt.literal('positive'),
    rt.literal('negative'),
  ]),
  steps: inRangeRt(2, 18),
  reverseColors: rt.boolean,
});

const sortRT = rt.type({
  by: rt.union([rt.literal('name'), rt.literal('value')]),
  direction: rt.union([rt.literal('desc'), rt.literal('asc')]),
});

const boundsRT = rt.type({
  max: inRangeRt(0, 1),
  min: inRangeRt(0, 1),
});

const customMetricRT = rt.partial({
  aggregation: rt.union([
    rt.literal('avg'),
    rt.literal('min'),
    rt.literal('max'),
    rt.literal('rate'),
  ]),
  field: rt.string,
  id: rt.string,
  label: rt.string,
  type: rt.literal('custom'),
});

export const inventoryViewAttributesRT = rt.type({
  accountId: rt.string,
  autoBounds: rt.boolean,
  autoReload: rt.boolean,
  boundsOverride: boundsRT,
  customMetrics: rt.array(customMetricRT),
  customOptions: rt.array(
    rt.partial({
      field: rt.string,
      text: rt.string,
    })
  ),
  filterQuery: rt.UnknownRecord,
  groupBy: rt.array(
    rt.partial({
      field: rt.string,
    })
  ),
  legend: legendRT,
  metric: SnapshotMetricInputRT,
  name: nonEmptyStringRt,
  nodeType: ItemTypeRT,
  region: rt.string,
  sort: sortRT,
  timelineOpen: rt.boolean,
  view: rt.union([rt.literal('map'), rt.literal('table')]),
});
