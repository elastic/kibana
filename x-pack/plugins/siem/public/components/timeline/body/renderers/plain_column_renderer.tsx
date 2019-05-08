/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isNumber } from 'lodash/fp';
import React from 'react';

import { TimelineNonEcsData } from '../../../../graphql/types';
import { escapeQueryValue } from '../../../../lib/keury';
import { DragEffects, DraggableWrapper } from '../../../drag_and_drop/draggable_wrapper';
import { escapeDataProviderId } from '../../../drag_and_drop/helpers';
import { getEmptyTagValue } from '../../../empty_value';
import { FormattedIp } from '../../../formatted_ip';
import { Provider } from '../../data_providers/provider';
import { ColumnHeader } from '../column_headers/column_header';
import { IP_FIELD_TYPE, FormattedFieldValue } from './formatted_field';
import { ColumnRenderer } from './column_renderer';
import { parseQueryValue } from './parse_query_value';
import { parseValue } from './parse_value';

export const dataExistsAtColumn = (columnName: string, data: TimelineNonEcsData[]): boolean =>
  data.findIndex(item => item.field === columnName) !== -1;

const contextId = 'plain_column_renderer';

export const plainColumnRenderer: ColumnRenderer = {
  isInstance: (columnName: string, data: TimelineNonEcsData[]) =>
    dataExistsAtColumn(columnName, data),
  renderColumn: ({
    columnName,
    eventId,
    values,
    field,
    width,
  }: {
    columnName: string;
    eventId: string;
    values: string[] | undefined | null;
    field: ColumnHeader;
    width?: string;
  }) =>
    values != null
      ? values.map(value => {
          const itemDataProvider = {
            enabled: true,
            id: escapeDataProviderId(
              `id-timeline-column-${columnName}-for-event-${eventId}-${field.id}-${value}`
            ),
            name: `${columnName}: ${parseQueryValue(value)}`,
            queryMatch: { field: field.id, value: escapeQueryValue(parseQueryValue(value)) },
            excluded: false,
            kqlQuery: '',
            and: [],
          };
          if (field.type === IP_FIELD_TYPE) {
            // since ip fields may contain multiple IP addresses, return a FormattedIp here to avoid a "draggable of draggables"
            return (
              <FormattedIp
                key={`timeline-draggable-column-${columnName}-for-event-${eventId}-${
                  field.id
                }--${value}`}
                eventId={eventId}
                contextId={contextId}
                fieldName={field.id}
                value={!isNumber(value) ? value : String(value)}
                width={width}
              />
            );
          }
          // note: we use a raw DraggableWrapper here instead of a DefaultDraggable,
          // because we pass a width to enable text truncation, and we will show empty values
          return (
            <DraggableWrapper
              key={`timeline-draggable-column-${columnName}-for-event-${eventId}-${
                field.id
              }--${value}`}
              dataProvider={itemDataProvider}
              render={(dataProvider, _, snapshot) =>
                snapshot.isDragging ? (
                  <DragEffects>
                    <Provider dataProvider={dataProvider} />
                  </DragEffects>
                ) : (
                  <FormattedFieldValue
                    eventId={eventId}
                    contextId={contextId}
                    fieldName={columnName}
                    fieldType={field.type || ''}
                    value={parseValue(value)}
                  />
                )
              }
              width={width}
            />
          );
        })
      : getEmptyTagValue(),
};
