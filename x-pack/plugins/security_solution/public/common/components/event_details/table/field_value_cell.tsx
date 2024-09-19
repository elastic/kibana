/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiText } from '@elastic/eui';
import { BrowserField } from '../../../containers/source';
import { OverflowField } from '../../tables/helpers';
import { FormattedFieldValue } from '../../../../timelines/components/timeline/body/renderers/formatted_field';
import { MESSAGE_FIELD_NAME } from '../../../../timelines/components/timeline/body/renderers/constants';
import { EventFieldsData, FieldsData } from '../types';

export interface FieldValueCellProps {
  contextId: string;
  data: EventFieldsData | FieldsData;
  eventId: string;
  fieldFromBrowserField?: BrowserField;
  getLinkValue?: (field: string) => string | null;
  isDraggable?: boolean;
  linkValue?: string | null | undefined;
  values: string[] | null | undefined;
}

export const FieldValueCell = React.memo(
  ({
    contextId,
    data,
    eventId,
    fieldFromBrowserField,
    getLinkValue,
    isDraggable = false,
    linkValue,
    values,
  }: FieldValueCellProps) => {
    return (
      <div data-test-subj={`event-field-${data.field}`}>
        {values != null &&
          values.map((value, i) => {
            if (fieldFromBrowserField == null) {
              return (
                <EuiText size="xs" key={value}>
                  {value}
                </EuiText>
              );
            }
            return (
              <div className="eventFieldsTable__fieldValue" key={value}>
                {data.field === MESSAGE_FIELD_NAME ? (
                  <OverflowField value={value} />
                ) : (
                  <FormattedFieldValue
                    contextId={`${contextId}-${eventId}-${data.field}-${i}-${value}`}
                    eventId={eventId}
                    fieldFormat={data.format}
                    fieldName={data.field}
                    fieldType={data.type}
                    isDraggable={isDraggable}
                    isObjectArray={data.isObjectArray}
                    value={value}
                    linkValue={(getLinkValue && getLinkValue(data.field)) ?? linkValue}
                  />
                )}
              </div>
            );
          })}
      </div>
    );
  }
);

FieldValueCell.displayName = 'FieldValueCell';
