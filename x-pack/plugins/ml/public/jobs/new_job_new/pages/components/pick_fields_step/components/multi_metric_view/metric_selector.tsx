/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { EuiFormRow, EuiFlexGroup, EuiFlexItem, EuiButton } from '@elastic/eui';
import { Field, Aggregation } from '../../../../../../../../common/types/fields';
import { AggSelect, DropDownLabel, DropDownProps } from '../agg_select';

interface Props {
  aggs: Aggregation[];
  fields: Field[];
  detectorChangeHandler: (options: DropDownLabel[]) => void;
  selectedOptions: DropDownProps;
  addDetector: () => void;
  maxWidth: number;
}

export const MetricSelector: FC<Props> = ({
  aggs,
  fields,
  detectorChangeHandler,
  selectedOptions,
  addDetector,
  maxWidth,
}) => {
  return (
    <EuiFlexGroup style={{ maxWidth }}>
      <EuiFlexItem>
        <EuiFormRow label="Add metric">
          <AggSelect
            aggs={aggs}
            fields={fields}
            changeHandler={detectorChangeHandler}
            selectedOptions={selectedOptions}
          />
        </EuiFormRow>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFormRow hasEmptyLabelSpace>
          <EuiButton onClick={addDetector} disabled={selectedOptions[0].label === ''}>
            Add
          </EuiButton>
        </EuiFormRow>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
