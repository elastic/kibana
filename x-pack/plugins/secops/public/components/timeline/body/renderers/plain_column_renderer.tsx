/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { has, isNil, isNumber, isObject } from 'lodash/fp';
import React from 'react';

import { Ecs } from '../../../../graphql/types';
import { getMappedFieldName } from '../../../../lib/ecs';
import { escapeQueryValue } from '../../../../lib/keury';
import { DragEffects, DraggableWrapper } from '../../../drag_and_drop/draggable_wrapper';
import { escapeDataProviderId } from '../../../drag_and_drop/helpers';
import { FormattedIp } from '../../../formatted_ip';
import { Provider } from '../../data_providers/provider';
import { ColumnHeader } from '../column_headers/column_header';

import { ColumnRenderer } from '.';
import { FormattedFieldValue, IP_FIELD_TYPE } from './formatted_field';

export const dataExistsAtColumn = (columnName: string, data: Ecs): boolean =>
  has(getMappedFieldName(columnName), data);

const contextId = 'plain_column_renderer';

export const plainColumnRenderer: ColumnRenderer = {
  isInstance: (columnName: string, ecs: Ecs) => dataExistsAtColumn(columnName, ecs),

  renderColumn: ({
    columnName,
    eventId,
    value,
    field,
    width,
  }: {
    columnName: string;
    eventId: string;
    value: string | number | object | undefined | null;
    field: ColumnHeader;
    width?: string;
  }) => {
    const itemDataProvider = {
      enabled: true,
      id: escapeDataProviderId(`id-timeline-column-${columnName}-for-event-${eventId}`),
      name: `${columnName}: ${parseQueryValue(value)}`,
      queryMatch: {
        field: field.id,
        value: escapeQueryValue(parseQueryValue(value)),
      },
      excluded: false,
      kqlQuery: '',
      and: [],
    };

    if (field.type === IP_FIELD_TYPE) {
      // since ip fields may contain multiple IP addresses, return a FormattedIp here to avoid a "draggable of draggables"
      return (
        <FormattedIp
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
        key={`timeline-draggable-column-${columnName}-for-event-${eventId}`}
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
  },
};

export const parseQueryValue = (
  value: string | number | object | undefined | null
): string | number => {
  if (isNil(value)) {
    return '';
  } else if (isObject(value)) {
    return JSON.stringify(value);
  } else if (isNumber(value)) {
    return value;
  }
  return value.toString();
};

export const parseValue = (
  value: string | number | object | undefined | null
): string | number | undefined | null => {
  if (isObject(value)) {
    return JSON.stringify(value);
  }
  return value as string | number | undefined | null;
};
