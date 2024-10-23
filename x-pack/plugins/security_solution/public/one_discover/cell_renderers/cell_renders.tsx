/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { DataGridCellValueElementProps } from '@kbn/unified-data-table';
import type { ReactElement } from 'react';
import type { TimelineNonEcsData } from '@kbn/timelines-plugin/common';
import type { Maybe } from '../../../common/search_strategy';
import { DefaultCellRenderer } from '../../timelines/components/timeline/cell_rendering/default_cell_renderer';

export type SecuritySolutionRowCellRendererGetter = () => (
  props: DataGridCellValueElementProps
) => ReactElement;

export const getCellRendererForGivenRecord: SecuritySolutionRowCellRendererGetter = () => {
  return function UnifiedFieldRenderBySecuritySolution(props: DataGridCellValueElementProps) {
    const data: TimelineNonEcsData[] = Object.keys(props.row.flattened).map((fieldName) => ({
      field: fieldName,
      value: Array.isArray(props.row.flattened[fieldName])
        ? (props.row.flattened[fieldName] as Maybe<string[]>)
        : ([props.row.flattened[fieldName]] as Maybe<string[]>),
    }));

    // return <p> {`Security ${props.columnId} - ${props.row.flattened[props.columnId]}`} </p>;

    return (
      <DefaultCellRenderer
        {...props}
        isDraggable={false}
        isTimeline={true}
        isDetails={false}
        isExpanded={false}
        isExpandable={true}
        data={data}
        eventId={props.row.id}
        scopeId={'not-timeline'}
        linkValues={undefined}
        header={{ id: props.columnId }}
      />
    );
  };
};
