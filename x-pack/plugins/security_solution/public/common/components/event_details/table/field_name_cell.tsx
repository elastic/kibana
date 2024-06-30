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
import type { DataViewField } from '@kbn/data-views-plugin/common';
import { EcsFlat } from '@elastic/ecs';
import * as i18n from '../translations';
import { getExampleText } from '../helpers';
import type { EventFieldsData } from '../types';
import { getFieldTypeName } from './get_field_type_name';

const getEcsField = (field: string): { example?: string; description?: string } | undefined => {
  return EcsFlat[field as keyof typeof EcsFlat] as
    | {
        example?: string;
        description?: string;
      }
    | undefined;
};

export interface FieldNameCellProps {
  data: EventFieldsData;
  field: string;
  fieldMapping?: DataViewField;
  scripted?: boolean;
}
export const FieldNameCell = React.memo(
  ({ data, field, fieldMapping, scripted }: FieldNameCellProps) => {
    const ecsField = getEcsField(field);
    const typeName = getFieldTypeName(data.type);
    // TODO: We don't have fieldMapping or isMultiField until kibana indexPatterns is implemented. Will default to field for now
    const displayName = fieldMapping && fieldMapping.displayName ? fieldMapping.displayName : field;
    const defaultTooltip = displayName !== field ? `${field} (${displayName})` : field;
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
                !isEmpty(ecsField?.description)
                  ? `${ecsField?.description} ${getExampleText(ecsField?.example)}`
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
