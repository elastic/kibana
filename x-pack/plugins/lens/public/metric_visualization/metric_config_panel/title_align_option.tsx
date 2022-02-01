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

const titleAlignPositions = [
  { id: 'left', label: 'Left', direction: 'row' },
  { id: 'right', label: 'Right', direction: 'row' },
  { id: 'center', label: 'Center', direction: 'row' },
];

export const TitleAlignOptions: React.FC<TitlePositionProps> = ({ state, setState }) => {
  const direction = ['top', 'bottom'].includes(state.titlePosition ?? 'top') ? 'column' : 'row';

  return (
    <EuiFormRow
      display="columnCompressed"
      label={
        <>
          {i18n.translate('xpack.lens.metricChart.titleAlignLabel', {
            defaultMessage: 'Title align',
          })}
        </>
      }
    >
      <EuiSuperSelect
        data-test-subj="lnsMissingValuesSelect"
        compressed
        options={titleAlignPositions
          .filter((pos) => pos.direction !== direction)
          .map((position) => {
            return {
              value: position.id,
              dropdownDisplay: position.label,
              inputDisplay: position.label,
            };
          })}
        valueOfSelected={state.titleAlignPosition ?? 'center'}
        onChange={(value) => {
          setState({ ...state, titleAlignPosition: value });
        }}
        itemLayoutAlign="top"
        hasDividers
      />
    </EuiFormRow>
  );
};
