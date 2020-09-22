/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useMemo } from 'react';

import { TimelineNonEcsData } from '../../../../../../common/search_strategy/timeline';
import { ColumnHeaderOptions } from '../../../../../timelines/store/timeline/model';
import {
  DraggableWrapper,
  DragEffects,
} from '../../../../../common/components/drag_and_drop/draggable_wrapper';
import { escapeDataProviderId } from '../../../../../common/components/drag_and_drop/helpers';
import { getEmptyValue } from '../../../../../common/components/empty_value';
import { EXISTS_OPERATOR, QueryOperator } from '../../data_providers/data_provider';
import { Provider } from '../../data_providers/provider';
import { ColumnRenderer } from './column_renderer';
import { parseQueryValue } from './parse_query_value';

export const dataNotExistsAtColumn = (columnName: string, data: TimelineNonEcsData[]): boolean =>
  data.findIndex((item) => item.field === columnName) === -1;

const EmptyColumnRendererComponent = ({
  columnName,
  eventId,
  field,
  timelineId,
  truncate,
}: {
  columnName: string;
  eventId: string;
  field: ColumnHeaderOptions;
  timelineId: string;
  truncate?: boolean;
}) => {
  const dataProviderProp = useMemo(
    () => ({
      enabled: true,
      id: escapeDataProviderId(
        `empty-column-renderer-draggable-wrapper-${timelineId}-${columnName}-${eventId}-${field.id}`
      ),
      name: `${columnName}: ${parseQueryValue(null)}`,
      queryMatch: {
        field: field.id,
        value: parseQueryValue(null),
        displayValue: getEmptyValue(),
        operator: EXISTS_OPERATOR as QueryOperator,
      },
      excluded: true,
      kqlQuery: '',
      and: [],
    }),
    [columnName, eventId, field.id, timelineId]
  );

  const render = useCallback(
    (dataProvider, _, snapshot) =>
      snapshot.isDragging ? (
        <DragEffects>
          <Provider dataProvider={dataProvider} />
        </DragEffects>
      ) : (
        <span>{getEmptyValue()}</span>
      ),
    []
  );

  return (
    <DraggableWrapper
      dataProvider={dataProviderProp}
      key={`empty-column-renderer-draggable-wrapper-${timelineId}-${columnName}-${eventId}-${field.id}`}
      render={render}
      truncate={truncate}
    />
  );
};

export const emptyColumnRenderer: ColumnRenderer = {
  isInstance: (columnName: string, data: TimelineNonEcsData[]) =>
    dataNotExistsAtColumn(columnName, data),
  renderColumn: EmptyColumnRendererComponent,
};
