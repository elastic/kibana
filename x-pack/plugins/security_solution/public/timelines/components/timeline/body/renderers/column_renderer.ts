/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type React from 'react';
import type { Filter } from '@kbn/es-query';

import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import type { ColumnHeaderOptions, RowRenderer } from '../../../../../../common/types';
import type { TimelineNonEcsData } from '../../../../../../common/search_strategy/timeline';

export interface ColumnRenderer {
  isInstance: (columnName: string, data: TimelineNonEcsData[]) => boolean;
  renderColumn: ({
    className,
    columnName,
    eventId,
    field,
    globalFilters,
    isDetails,
    isDraggable,
    linkValues,
    rowRenderers,
    scopeId,
    truncate,
    values,
    key,
  }: {
    asPlainText?: boolean;
    className?: string;
    columnName: string;
    ecsData?: Ecs;
    eventId: string;
    field: ColumnHeaderOptions;
    globalFilters?: Filter[];
    isDetails?: boolean;
    isDraggable?: boolean;
    linkValues?: string[] | null | undefined;
    rowRenderers?: RowRenderer[];
    scopeId: string;
    truncate?: boolean;
    values: string[] | null | undefined;
    key?: string;
  }) => React.ReactNode;
}
