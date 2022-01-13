/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RowRenderer } from '../../../../../../common/types';
import { Ecs } from '../../../../../../common/ecs';

export const getRowRenderer = (ecs: Ecs, rowRenderers: RowRenderer[]): RowRenderer | null =>
  rowRenderers.find((rowRenderer) => rowRenderer.isInstance(ecs)) ?? null;
