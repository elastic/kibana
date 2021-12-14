/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ColumnHeaderOptions } from '../../../../../../common/types';
import { TimelineNonEcsData } from '../../../../../../common/search_strategy/timeline';
import {
  DraggableWrapper,
  DragEffects,
} from '../../../../../common/components/drag_and_drop/draggable_wrapper';
import { escapeDataProviderId } from '../../../../../common/components/drag_and_drop/helpers';
import { getEmptyValue } from '../../../../../common/components/empty_value';
import { EXISTS_OPERATOR } from '../../data_providers/data_provider';
import { Provider } from '../../data_providers/provider';
import { ColumnRenderer } from './column_renderer';
import { parseQueryValue } from './parse_query_value';

export const dataNotExistsAtColumn = (columnName: string, data: TimelineNonEcsData[]): boolean =>
  data.findIndex((item) => item.field === columnName) === -1;

export const emptyColumnRenderer: ColumnRenderer = {
  isInstance: (columnName: string, data: TimelineNonEcsData[]) =>
    dataNotExistsAtColumn(columnName, data),
  renderColumn: ({
    columnName,
    eventId,
    field,
    isDraggable = true,
    timelineId,
    truncate,
  }: {
    columnName: string;
    eventId: string;
    field: ColumnHeaderOptions;
    isDraggable?: boolean;
    timelineId: string;
    truncate?: boolean;
  }) =>
    isDraggable ? (
      <DraggableWrapper
        dataProvider={{
          enabled: true,
          id: escapeDataProviderId(
            `empty-column-renderer-draggable-wrapper-${timelineId}-${columnName}-${eventId}-${field.id}`
          ),
          name: `${columnName}: ${parseQueryValue(null)}`,
          queryMatch: {
            field: field.id,
            value: parseQueryValue(null),
            displayValue: getEmptyValue(),
            operator: EXISTS_OPERATOR,
          },
          excluded: true,
          kqlQuery: '',
          and: [],
        }}
        isDraggable={isDraggable}
        key={`empty-column-renderer-draggable-wrapper-${timelineId}-${columnName}-${eventId}-${field.id}`}
        render={(dataProvider, _, snapshot) =>
          snapshot.isDragging ? (
            <DragEffects>
              <Provider dataProvider={dataProvider} />
            </DragEffects>
          ) : (
            <span>{getEmptyValue()}</span>
          )
        }
        truncate={truncate}
      />
    ) : (
      <span>{getEmptyValue()}</span>
    ),
};
