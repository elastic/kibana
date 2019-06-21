/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { EuiFormRow, EuiFlexGroup, EuiFlexItem, EuiButton } from '@elastic/eui';
import { Field, Aggregation, AggFieldPair } from '../../../../../../../../common/types/fields';
import { AggSelect, DropDownLabel, DropDownProps } from '../agg_select';

interface Props {
  fields: Field[];
  detectorChangeHandler: (options: DropDownLabel[]) => void;
  selectedOptions: DropDownProps;
  addDetector?: () => void;
  maxWidth: number;
  removeOptions: AggFieldPair[];
}

export const MetricSelector: FC<Props> = ({
  fields,
  detectorChangeHandler,
  selectedOptions,
  addDetector,
  maxWidth,
  removeOptions,
}) => {
  return (
    <EuiFlexGroup style={{ maxWidth }}>
      <EuiFlexItem>
        <EuiFormRow label="Add metric">
          <AggSelect
            fields={fields}
            changeHandler={detectorChangeHandler}
            selectedOptions={selectedOptions}
            removeOptions={removeOptions}
          />
        </EuiFormRow>
      </EuiFlexItem>
      {/* <EuiFlexItem grow={false}>
        <EuiFormRow hasEmptyLabelSpace>
          <EuiButton onClick={addDetector} disabled={selectedOptions[0].label === ''}>
            Add
          </EuiButton>
        </EuiFormRow>
      </EuiFlexItem> */}
    </EuiFlexGroup>
  );
};
