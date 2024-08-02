/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import type { FieldSpec } from '@kbn/data-plugin/common';
import { getFieldFormat } from '../../../../common/components/event_details/get_field_format';
import type { EventFieldsData } from '../../../../common/components/event_details/types';
import { OverflowField } from '../../../../common/components/tables/helpers';
import { FormattedFieldValue } from '../../../../timelines/components/timeline/body/renderers/formatted_field';
import { MESSAGE_FIELD_NAME } from '../../../../timelines/components/timeline/body/renderers/constants';

export interface FieldValueCellProps {
  /**
   * Value used to create a unique identifier in children components
   */
  contextId: string;
  /**
   * Datq retrieved from the row
   */
  data: EventFieldsData;
  /**
   * Id of the document
   */
  eventId: string;
  /**
   * Field retrieved from the BrowserField
   */
  fieldFromBrowserField?: Partial<FieldSpec>;
  /**
   * Value of the link field if it exists. Allows to navigate to other pages like host, user, network...
   */
  getLinkValue?: (field: string) => string | null;
  /**
   * Values for the field, to render in the second column of the table
   */
  values: string[] | null | undefined;
}

/**
 * Renders the value of a field in the second column of the table
 */
export const TableFieldValueCell = memo(
  ({
    contextId,
    data,
    eventId,
    fieldFromBrowserField,
    getLinkValue,
    values,
  }: FieldValueCellProps) => {
    if (values == null) {
      return null;
    }

    return (
      <EuiFlexGroup
        data-test-subj={`event-field-${data.field}`}
        direction="column"
        gutterSize="none"
      >
        {values.map((value, i) => {
          if (fieldFromBrowserField == null) {
            return (
              <EuiFlexItem grow={false} key={`${i}-${value}`}>
                <EuiText size="xs" key={`${i}-${value}`}>
                  {value}
                </EuiText>
              </EuiFlexItem>
            );
          }

          return (
            <EuiFlexItem grow={false} key={`${i}-${value}`}>
              {data.field === MESSAGE_FIELD_NAME ? (
                <OverflowField value={value} />
              ) : (
                <FormattedFieldValue
                  contextId={`${contextId}-${eventId}-${data.field}-${i}-${value}`}
                  eventId={eventId}
                  fieldFormat={getFieldFormat(data)}
                  fieldName={data.field}
                  fieldFromBrowserField={fieldFromBrowserField}
                  fieldType={data.type}
                  isAggregatable={fieldFromBrowserField.aggregatable}
                  isDraggable={false}
                  isObjectArray={data.isObjectArray}
                  value={value}
                  linkValue={getLinkValue && getLinkValue(data.field)}
                  truncate={false}
                />
              )}
            </EuiFlexItem>
          );
        })}
      </EuiFlexGroup>
    );
  }
);

TableFieldValueCell.displayName = 'TableFieldValueCell';
