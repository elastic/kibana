/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { RowRendererId } from '..';
import type { Ecs } from '../../../ecs';
import type { BrowserFields } from '../../../search_strategy/index_fields';

export interface RowRenderer {
  id: RowRendererId;
  isInstance: (data: Ecs) => boolean;
  renderRow: ({
    browserFields,
    data,
    isDraggable,
    timelineId,
  }: {
    browserFields: BrowserFields;
    data: Ecs;
    isDraggable: boolean;
    timelineId: string;
  }) => React.ReactNode;
}
