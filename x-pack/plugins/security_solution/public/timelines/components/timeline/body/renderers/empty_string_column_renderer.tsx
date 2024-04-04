/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ColumnHeaderOptions } from '../../../../../../common/types';
import type { TimelineNonEcsData } from '../../../../../../common/search_strategy/timeline';
import {
  DraggableWrapper,
  DragEffects,
} from '../../../../../common/components/drag_and_drop/draggable_wrapper';
import { escapeDataProviderId } from '../../../../../common/components/drag_and_drop/helpers';
import { getEmptyString } from '../../../../../common/components/empty_value';
import { EXISTS_OPERATOR } from '../../data_providers/data_provider';
import { Provider } from '../../data_providers/provider';
import type { ColumnRenderer } from './column_renderer';
import { parseQueryValue } from './parse_query_value';

/**
 * Checks if all values are empty strings for given columnName
 */
export const isColumnValueAnEmptyString = (
  columnName: string,
  data: TimelineNonEcsData[]
): boolean =>
  !!data.find(({ field }) => field === columnName)?.value?.every((value) => value === '');

export const emptyStringColumnRenderer: ColumnRenderer = {
  isInstance: isColumnValueAnEmptyString,
  renderColumn: ({
    columnName,
    eventId,
    field,
    isDraggable = true,
    scopeId,
  }: {
    columnName: string;
    eventId: string;
    field: ColumnHeaderOptions;
    isDraggable?: boolean;
    scopeId: string;
    truncate?: boolean;
  }) =>
    isDraggable ? (
      <DraggableWrapper
        dataProvider={{
          enabled: true,
          id: escapeDataProviderId(
            `empty-string-column-renderer-draggable-wrapper-${scopeId}-${columnName}-${eventId}-${field.id}`
          ),
          name: `${columnName}: ${parseQueryValue(null)}`,
          queryMatch: {
            field: field.id,
            value: '',
            displayValue: getEmptyString(),
            operator: EXISTS_OPERATOR,
          },
          excluded: true,
          kqlQuery: '',
          and: [],
        }}
        isDraggable={isDraggable}
        key={`empty-string-column-renderer-draggable-wrapper-${scopeId}-${columnName}-${eventId}-${field.id}`}
        render={(dataProvider, _, snapshot) =>
          snapshot.isDragging ? (
            <DragEffects>
              <Provider dataProvider={dataProvider} />
            </DragEffects>
          ) : (
            <span>{getEmptyString()}</span>
          )
        }
        truncate={false}
        scopeId={scopeId}
      />
    ) : (
      <span>{getEmptyString()}</span>
    ),
};
