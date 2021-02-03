/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Ecs } from '../../../../../../common/ecs';
import { RowRenderer } from './row_renderer';

export const getRowRenderer = (ecs: Ecs, rowRenderers: RowRenderer[]): RowRenderer | null =>
  rowRenderers.find((rowRenderer) => rowRenderer.isInstance(ecs)) ?? null;
