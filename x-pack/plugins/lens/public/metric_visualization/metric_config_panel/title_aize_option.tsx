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

const titleSizes = [
  { id: 'xs', label: 'XS' },
  { id: 's', label: 'S' },
  { id: 'm', label: 'M' },
  { id: 'l', label: 'L' },
  { id: 'xl', label: 'XL' },
  { id: 'xxl', label: 'XXL' },
];

export const TitleSizeOptions: React.FC<TitlePositionProps> = ({ state, setState }) => {
  return (
    <EuiFormRow
      display="columnCompressed"
      label={
        <>
          {i18n.translate('xpack.lens.metricChart.titleSizeLabel', {
            defaultMessage: 'Title size',
          })}
        </>
      }
    >
      <EuiSuperSelect
        data-test-subj="lnsMissingValuesSelect"
        compressed
        options={titleSizes.map((position) => {
          return {
            value: position.id,
            dropdownDisplay: position.label,
            inputDisplay: position.label,
          };
        })}
        valueOfSelected={state.titleSize ?? 'xl'}
        onChange={(value) => {
          setState({ ...state, titleSize: value });
        }}
        itemLayoutAlign="top"
        hasDividers
      />
    </EuiFormRow>
  );
};
