/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFormRow, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { Field, AggFieldPair } from '../../../../../../../../../common/types/fields';
import { AggSelect, DropDownLabel, DropDownProps } from '../agg_select';

interface Props {
  fields: Field[];
  detectorChangeHandler: (options: DropDownLabel[]) => void;
  selectedOptions: DropDownProps;
  maxWidth?: number;
  removeOptions: AggFieldPair[];
}

const MAX_WIDTH = 560;

export const MetricSelector: FC<Props> = ({
  fields,
  detectorChangeHandler,
  selectedOptions,
  maxWidth,
  removeOptions,
}) => {
  return (
    <EuiFlexGroup style={{ maxWidth: maxWidth !== undefined ? maxWidth : MAX_WIDTH }}>
      <EuiFlexItem>
        <EuiFormRow
          label={i18n.translate('xpack.ml.newJob.wizard.pickFieldsStep.populationView.addMetric', {
            defaultMessage: 'Add metric',
          })}
        >
          <AggSelect
            fields={fields}
            changeHandler={detectorChangeHandler}
            selectedOptions={selectedOptions}
            removeOptions={removeOptions}
          />
        </EuiFormRow>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
