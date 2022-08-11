/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiDataGridCellValueElementProps } from '@elastic/eui';
import type { Filter } from '@kbn/es-query';
import { RowRenderer } from '../..';
import { Ecs } from '../../../ecs';
import { BrowserFields, TimelineNonEcsData } from '../../../search_strategy';
import { ColumnHeaderOptions } from '../columns';

/** The following props are provided to the function called by `renderCellValue` */
export type CellValueElementProps = EuiDataGridCellValueElementProps & {
  asPlainText?: boolean;
  browserFields?: BrowserFields;
  data: TimelineNonEcsData[];
  ecsData?: Ecs;
  eventId: string; // _id
  globalFilters?: Filter[];
  header: ColumnHeaderOptions;
  isDraggable: boolean;
  isTimeline?: boolean; // Default cell renderer is used for both the alert table and timeline. This allows us to cheaply separate concerns
  linkValues: string[] | undefined;
  rowRenderers?: RowRenderer[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setFlyoutAlert?: (data: any) => void;
  timelineId: string;
  truncate?: boolean;
};
