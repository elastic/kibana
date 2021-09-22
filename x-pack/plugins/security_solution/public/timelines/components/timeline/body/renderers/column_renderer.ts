/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type React from 'react';

import { BrowserFields, ColumnHeaderOptions, RowRenderer } from '../../../../../../common';
import { Ecs } from '../../../../../../common/ecs';
import { TimelineNonEcsData } from '../../../../../../common/search_strategy/timeline';

export interface ColumnRenderer {
  isInstance: (columnName: string, data: TimelineNonEcsData[]) => boolean;
  renderColumn: ({
    columnName,
    eventId,
    field,
    isDraggable,
    timelineId,
    truncate,
    values,
    linkValues,
  }: {
    columnName: string;
    eventId: string;
    field: ColumnHeaderOptions;
    isDraggable?: boolean;
    timelineId: string;
    truncate?: boolean;
    values: string[] | null | undefined;
    linkValues?: string[] | null | undefined;
    ecsData?: Ecs;
    rowRenderers?: RowRenderer[];
    browserFields?: BrowserFields;
  }) => React.ReactNode;
}
