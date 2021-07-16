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
import { EventFieldsData } from '../types';

export interface FieldValueCellProps {
  contextId: string;
  data: EventFieldsData;
  eventId: string;
  fieldFromBrowserField: Readonly<Record<string, Partial<BrowserField>>>;
  getLinkValue: (field: string) => string | null;
  values: string[] | null | undefined;
}

export const FieldValueCell = React.memo(
  ({
    contextId,
    data,
    eventId,
    fieldFromBrowserField,
    getLinkValue,
    values,
  }: FieldValueCellProps) => {
    return (
      <div className="eventFieldsTable__fieldValueCell">
        {values != null &&
          values.map((value, i) => {
            if (fieldFromBrowserField == null) {
              return <EuiText size="s">{value}</EuiText>;
            }
            return (
              <div>
                {data.field === MESSAGE_FIELD_NAME ? (
                  <OverflowField value={value} />
                ) : (
                  <FormattedFieldValue
                    contextId={`event-details-value-formatted-field-value-${contextId}-${eventId}-${data.field}-${i}-${value}`}
                    eventId={eventId}
                    fieldFormat={data.format}
                    fieldName={data.field}
                    fieldType={data.type}
                    isObjectArray={data.isObjectArray}
                    value={value}
                    linkValue={getLinkValue(data.field)}
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
