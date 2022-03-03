/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { HTMLAttributes, useState } from 'react';

import { TimelineNonEcsData } from '../../../../../../common/search_strategy/timeline';
import {
  ColumnHeaderOptions,
  CellValueElementProps,
  TimelineTabs,
} from '../../../../../../common/types/timeline';

export interface CommonProps {
  className?: string;
  'aria-label'?: string;
  'data-test-subj'?: string;
}

const StatefulCellComponent = ({
  rowIndex,
  colIndex,
  data,
  header,
  eventId,
  linkValues,
  renderCellValue,
  tabType,
  timelineId,
}: {
  rowIndex: number;
  colIndex: number;
  data: TimelineNonEcsData[];
  header: ColumnHeaderOptions;
  eventId: string;
  linkValues: string[] | undefined;
  renderCellValue: (props: CellValueElementProps) => React.ReactNode;
  tabType?: TimelineTabs;
  timelineId: string;
}) => {
  const [cellProps, setCellProps] = useState<CommonProps & HTMLAttributes<HTMLDivElement>>({});
  return (
    <div data-test-subj="statefulCell" {...cellProps}>
      {renderCellValue({
        columnId: header.id,
        eventId,
        data,
        header,
        isDraggable: true,
        isExpandable: true,
        isExpanded: false,
        isDetails: false,
        isTimeline: true,
        linkValues,
        rowIndex,
        colIndex,
        setCellProps,
        timelineId: tabType != null ? `${timelineId}-${tabType}` : timelineId,
      })}
    </div>
  );
};

StatefulCellComponent.displayName = 'StatefulCellComponent';

export const StatefulCell = React.memo(StatefulCellComponent);
