/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Ecs } from '../../../../../../common/ecs';
import { TimelineNonEcsData } from '../../../../../../common/search_strategy';
import { RowRenderer } from './row_renderer';

export const getRowRenderer = (
  rowRenderers: RowRenderer[],
  ecs: Ecs,
  data: TimelineNonEcsData[]
): RowRenderer | null =>
  rowRenderers.find((rowRenderer) => rowRenderer.isInstance(ecs, data)) ?? null;
