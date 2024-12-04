/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Type, schema } from '@kbn/config-schema';
import { columnStateSchema, rowHeightModeSchema, sortingStateSchema } from '../common';
import { LayerType } from '../../../../../common/types';
import { layerTypes } from '../../../../../common/layer_types';

const pagingStateSchema = schema.object({
  size: schema.number(),
  enabled: schema.boolean(),
});

export const datatableVisualizationStateSchema = schema.object({
  columns: schema.arrayOf(columnStateSchema),
  layerId: schema.string(),
  layerType: schema.oneOf(
    Object.values(layerTypes).map((value) => schema.literal(value)) as [Type<LayerType>]
  ),
  sorting: schema.maybe(sortingStateSchema),
  rowHeight: schema.maybe(rowHeightModeSchema),
  headerRowHeight: schema.maybe(rowHeightModeSchema),
  rowHeightLines: schema.maybe(schema.number()),
  headerRowHeightLines: schema.maybe(schema.number()),
  paging: schema.maybe(pagingStateSchema),
});
