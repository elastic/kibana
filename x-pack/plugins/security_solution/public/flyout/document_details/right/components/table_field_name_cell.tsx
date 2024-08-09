/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText, EuiToolTip } from '@elastic/eui';
import { isEmpty } from 'lodash';
import { FieldIcon } from '@kbn/react-field';
import { EcsFlat } from '@elastic/ecs';
import { getFieldTypeName } from '@kbn/field-utils';
import {
  FLYOUT_TABLE_FIELD_NAME_CELL_ICON_TEST_ID,
  FLYOUT_TABLE_FIELD_NAME_CELL_TEXT_TEST_ID,
} from './test_ids';
import { getExampleText } from '../../../../common/components/event_details/helpers';

const getEcsField = (field: string): { example?: string; description?: string } | undefined => {
  return EcsFlat[field as keyof typeof EcsFlat] as
    | {
        example?: string;
        description?: string;
      }
    | undefined;
};

export interface TableFieldNameCellProps {
  /**
   * Type used to pick the correct icon
   */
  dataType: string;
  /**
   * Field name
   */
  field: string;
}

/**
 * Renders an icon/text couple in the first column of the table
 */
export const TableFieldNameCell = memo(({ dataType, field }: TableFieldNameCellProps) => {
  const ecsField = getEcsField(field);
  const typeName = getFieldTypeName(dataType);

  return (
    <EuiFlexGroup gutterSize="xs" alignItems="center">
      <EuiFlexItem grow={false}>
        <FieldIcon
          data-test-subj={FLYOUT_TABLE_FIELD_NAME_CELL_ICON_TEST_ID}
          type={dataType}
          label={typeName}
          scripted={undefined}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFlexGroup wrap={true} gutterSize="none" responsive={false}>
          <EuiFlexItem className="eui-textBreakAll" grow={false}>
            <EuiToolTip
              position="top"
              content={
                !isEmpty(ecsField?.description)
                  ? `${ecsField?.description} ${getExampleText(ecsField?.example)}`
                  : field
              }
              delay="long"
              anchorClassName="eui-textBreakAll"
            >
              <EuiText size="xs" data-test-subj={FLYOUT_TABLE_FIELD_NAME_CELL_TEXT_TEST_ID}>
                {field}
              </EuiText>
            </EuiToolTip>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});

TableFieldNameCell.displayName = 'TableFieldNameCell';
