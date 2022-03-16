/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { head } from 'lodash/fp';
import React from 'react';
import type { Filter } from '@kbn/es-query';

import { ColumnHeaderOptions } from '../../../../../../common/types';
import { TimelineNonEcsData } from '../../../../../../common/search_strategy/timeline';
import { getEmptyTagValue } from '../../../../../common/components/empty_value';
import { ColumnRenderer } from './column_renderer';
import { FormattedFieldValue } from './formatted_field';
import { parseValue } from './parse_value';

export const dataExistsAtColumn = (columnName: string, data: TimelineNonEcsData[]): boolean =>
  data.findIndex((item) => item.field === columnName) !== -1;

export const plainColumnRenderer: ColumnRenderer = {
  isInstance: (columnName: string, data: TimelineNonEcsData[]) =>
    dataExistsAtColumn(columnName, data),
  renderColumn: ({
    asPlainText,
    columnName,
    eventId,
    field,
    isDraggable = true,
    timelineId,
    truncate,
    values,
    linkValues,
  }: {
    asPlainText?: boolean;
    columnName: string;
    eventId: string;
    field: ColumnHeaderOptions;
    globalFilters?: Filter[];
    isDraggable?: boolean;
    timelineId: string;
    truncate?: boolean;
    values: string[] | undefined | null;
    linkValues?: string[] | null | undefined;
  }) =>
    values != null
      ? values.map((value, i) => (
          <FormattedFieldValue
            asPlainText={asPlainText}
            contextId={`plain-column-renderer-formatted-field-value-${timelineId}`}
            eventId={eventId}
            fieldFormat={field.format || ''}
            fieldName={columnName}
            fieldType={field.type || ''}
            isDraggable={isDraggable}
            key={`plain-column-renderer-formatted-field-value-${timelineId}-${columnName}-${eventId}-${field.id}-${value}-${i}`}
            linkValue={head(linkValues)}
            truncate={truncate}
            value={parseValue(value)}
          />
        ))
      : getEmptyTagValue(),
};
