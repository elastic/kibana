/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UnitsMap, unitsMap } from '@elastic/datemath';
import { schema, TypeOf } from '@kbn/config-schema';
import { SNAPSHOT_CUSTOM_AGGREGATIONS } from '../../../../common/http_api/snapshot_api';
import { ItemTypeRT, SnapshotMetricTypeKeys } from '../../../../common/inventory_models/types';
import { oneOfLiterals, validateIsStringElasticsearchJSONFilter } from '../common/utils';
import { Comparator } from './types';

const condition = schema.object({
  threshold: schema.arrayOf(schema.number()),
  comparator: oneOfLiterals(Object.values(Comparator)),
  timeUnit: oneOfLiterals(Object.keys(unitsMap) as Array<keyof UnitsMap>),
  timeSize: schema.number(),
  metric: oneOfLiterals(
    Object.keys(SnapshotMetricTypeKeys) as Array<keyof typeof SnapshotMetricTypeKeys>
  ),
  warningThreshold: schema.maybe(schema.arrayOf(schema.number())),
  warningComparator: schema.maybe(oneOfLiterals(Object.values(Comparator))),
  customMetric: schema.maybe(
    schema.object({
      type: schema.literal('custom'),
      id: schema.string(),
      field: schema.string(),
      aggregation: oneOfLiterals(SNAPSHOT_CUSTOM_AGGREGATIONS),
      label: schema.maybe(schema.string()),
    })
  ),
});

export const inventoryMetricThresholdAlertParamsSchema = schema.object(
  {
    criteria: schema.arrayOf(condition),
    nodeType: oneOfLiterals(Object.keys(ItemTypeRT.keys) as Array<keyof typeof ItemTypeRT.keys>),
    filterQuery: schema.maybe(schema.string({ validate: validateIsStringElasticsearchJSONFilter })),
    sourceId: schema.string(),
    alertOnNoData: schema.maybe(schema.boolean()),
  },
  { unknowns: 'allow' }
);

export type InventoryMetricThresholdAlertTypeParams = TypeOf<
  typeof inventoryMetricThresholdAlertParamsSchema
>;
