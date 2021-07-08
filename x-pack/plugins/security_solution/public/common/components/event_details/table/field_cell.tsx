/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexItem, EuiIconTip, EuiText } from '@elastic/eui';
import { isEmpty } from 'lodash';
import * as i18n from '../translations';
import { FieldIcon } from '../../../../../../../../src/plugins/kibana_react/public';
import { getExampleText, getColumnsWithTimestamp } from '../helpers';
import { BrowserFields, BrowserField } from '../../../containers/source';
import { FieldName } from '../../../../timelines/components/fields_browser/field_name';
import { OnUpdateColumns } from '../../../../timelines/components/timeline/events';
import { EventFieldsData } from '../types';

export interface FieldCellProps {
  browserFields: BrowserFields;
  data: EventFieldsData;
  field: string;
  fieldFromBrowserField: Readonly<Record<string, Partial<BrowserField>>>;
  onUpdateColumns: OnUpdateColumns;
}
export const FieldCell = React.memo(
  ({ browserFields, data, field, fieldFromBrowserField, onUpdateColumns }: FieldCellProps) => {
    return (
      <>
        <EuiFlexItem grow={false} className="kbnDocViewer__fieldIcon">
          <FieldIcon
            data-test-subj="field-type-icon"
            type={data.type}
            label={data.type} // create typename
            scripted // boolean
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          {(data.isObjectArray && data.type !== 'geo_point') || fieldFromBrowserField == null ? (
            <EuiText size="xs">{field}</EuiText>
          ) : (
            <FieldName
              categoryColumns={getColumnsWithTimestamp({
                browserFields,
                category: data.category,
              })}
              categoryId={data.category}
              closePopOverTrigger // boolean
              data-test-subj="field-name"
              fieldId={field}
              handleClosePopOverTrigger={() => {}}
              hoverActionsOwnFocus={false}
              onCloseRequested={() => {}}
              onUpdateColumns={onUpdateColumns}
            />
          )}
        </EuiFlexItem>
        {!isEmpty(data.description) && (
          <EuiFlexItem grow={false}>
            <EuiIconTip
              aria-label={i18n.DESCRIPTION}
              type="iInCircle"
              color="subdued"
              content={`${data.description} ${getExampleText(data.example)}`}
            />
          </EuiFlexItem>
        )}
      </>
    );
  }
);

FieldCell.displayName = 'FieldCell';
