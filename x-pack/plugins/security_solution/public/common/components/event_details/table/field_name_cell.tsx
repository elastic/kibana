/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiBadge, EuiText, EuiToolTip } from '@elastic/eui';
import { isEmpty } from 'lodash';
import { FieldIcon } from '@kbn/react-field';
import * as i18n from '../translations';
import type { DataViewField } from '../../../../../../../../src/plugins/data_views/common';
import { getExampleText } from '../helpers';
import { BrowserField } from '../../../containers/source';
import { EventFieldsData } from '../types';
import { getFieldTypeName } from './get_field_type_name';

export interface FieldNameCellProps {
  data: EventFieldsData;
  field: string;
  fieldFromBrowserField: BrowserField;
  fieldMapping?: DataViewField;
  scripted?: boolean;
}
export const FieldNameCell = React.memo(
  ({ data, field, fieldMapping, scripted }: FieldNameCellProps) => {
    const typeName = getFieldTypeName(data.type);
    // TODO: We don't have fieldMapping or isMultiField until kibana indexPatterns is implemented. Will default to field for now
    const displayName = fieldMapping && fieldMapping.displayName ? fieldMapping.displayName : field;
    const defaultTooltip = displayName !== field ? `${field} (${displayName})` : field;
    // TODO: Remove. This is what was used to show the plaintext fieldName vs the tooltip one
    // const showPlainTextName =
    //   (data.isObjectArray && data.type !== 'geo_point') || fieldFromBrowserField == null;
    const isMultiField = fieldMapping?.isSubtypeMulti();
    return (
      <>
        <EuiFlexItem grow={false} className="eventFieldsTable__fieldIcon">
          <FieldIcon
            data-test-subj="field-type-icon"
            type={data.type}
            label={typeName}
            scripted={scripted} // TODO: Will get with kibana indexPatterns;
          />
        </EuiFlexItem>
        <EuiFlexGroup
          wrap={true}
          gutterSize="none"
          responsive={false}
          alignItems="flexStart"
          data-test-subj="field-name-cell"
        >
          <EuiFlexItem className="eventFieldsTable__fieldName eui-textBreakAll" grow={false}>
            <EuiToolTip
              position="top"
              content={
                !isEmpty(data.description)
                  ? `${data.description} ${getExampleText(data.example)}`
                  : defaultTooltip
              }
              delay="long"
              anchorClassName="eui-textBreakAll"
            >
              <EuiText size="xs" data-test-subj="field-name">
                {field}
              </EuiText>
            </EuiToolTip>
          </EuiFlexItem>
          {isMultiField && (
            <EuiToolTip position="top" delay="long" content={i18n.MULTI_FIELD_TOOLTIP}>
              <EuiBadge
                title=""
                className="eventFieldsTable__multiFieldBadge"
                color="default"
                data-test-subj={`eventFieldsTableRow-${field}-multifieldBadge`}
              >
                {i18n.MULTI_FIELD_BADGE}
              </EuiBadge>
            </EuiToolTip>
          )}
        </EuiFlexGroup>
      </>
    );
  }
);

FieldNameCell.displayName = 'FieldNameCell';
