/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFormRow, EuiSuperSelect } from '@elastic/eui';
import { MetricState } from '../../../common/expressions';

export interface TitlePositionProps {
  state: MetricState;
  setState: (newState: MetricState) => void;
}

const titlePositions = [
  { id: 'top', label: 'Top' },
  { id: 'bottom', label: 'Bottom' },
];

export const TitlePositionOptions: React.FC<TitlePositionProps> = ({ state, setState }) => {
  return (
    <EuiFormRow
      display="columnCompressed"
      label={
        <>
          {i18n.translate('xpack.lens.metricChart.titlePositionLabel', {
            defaultMessage: 'Title position',
          })}
        </>
      }
    >
      <EuiSuperSelect
        data-test-subj="lnsMissingValuesSelect"
        compressed
        options={titlePositions.map((position) => {
          return {
            value: position.id,
            dropdownDisplay: position.label,
            inputDisplay: position.label,
          };
        })}
        valueOfSelected={state.titlePosition ?? 'top'}
        onChange={(value) => {
          setState({ ...state, titlePosition: value });
        }}
        itemLayoutAlign="top"
        hasDividers
      />
    </EuiFormRow>
  );
};
