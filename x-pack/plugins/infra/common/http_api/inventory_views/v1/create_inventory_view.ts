/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inRangeRt, nonEmptyStringRt } from '@kbn/io-ts-utils';
import * as rt from 'io-ts';
import { ItemTypeRT } from '../../../inventory_models/types';
import { SnapshotMetricInputRT } from '../../snapshot_api';

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

export const createInventoryViewAttributesRequestPayloadRT = rt.exact(
  rt.intersection([
    rt.type({
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
    }),

    rt.partial({
      isDefault: rt.undefined,
      isStatic: rt.undefined,
    }),
  ])
);

export type CreateInventoryViewAttributesRequestPayload = rt.TypeOf<
  typeof createInventoryViewAttributesRequestPayloadRT
>;

export const createInventoryViewRequestPayloadRT = rt.type({
  attributes: createInventoryViewAttributesRequestPayloadRT,
});
