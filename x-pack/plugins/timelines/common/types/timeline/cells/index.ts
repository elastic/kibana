/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiDataGridCellValueElementProps } from '@elastic/eui';
import { RowRenderer } from '../../..';
import { Ecs } from '../../../ecs';
import { BrowserFields, TimelineNonEcsData } from '../../../search_strategy';
import { ColumnHeaderOptions } from '../columns';

/** The following props are provided to the function called by `renderCellValue` */
export type CellValueElementProps = EuiDataGridCellValueElementProps & {
  data: TimelineNonEcsData[];
  eventId: string; // _id
  header: ColumnHeaderOptions;
  isDraggable: boolean;
  linkValues: string[] | undefined;
  timelineId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setFlyoutAlert?: (data: any) => void;
  ecsData?: Ecs;
  rowRenderers?: RowRenderer[];
  browserFields?: BrowserFields;
};
