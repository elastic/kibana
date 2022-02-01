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
  {
    id: 'xs',
    label: i18n.translate('xpack.lens.metricChart.metricSize.extraSmall', {
      defaultMessage: 'Extra small',
    }),
  },
  {
    id: 's',
    label: i18n.translate('xpack.lens.metricChart.metricSize.small', {
      defaultMessage: 'Small',
    }),
  },
  {
    id: 'm',
    label: i18n.translate('xpack.lens.metricChart.metricSize.medium', {
      defaultMessage: 'Medium',
    }),
  },
  {
    id: 'l',
    label: i18n.translate('xpack.lens.metricChart.metricSize.large', {
      defaultMessage: 'Large',
    }),
  },
  {
    id: 'xl',
    label: i18n.translate('xpack.lens.metricChart.metricSize.extraLarge', {
      defaultMessage: 'Extra large',
    }),
  },
  {
    id: 'xxl',
    label: i18n.translate('xpack.lens.metricChart.metricSize.xxl', {
      defaultMessage: 'Extra extra large',
    }),
  },
];

export const SizeOptions: React.FC<TitlePositionProps> = ({ state, setState }) => {
  return (
    <EuiFormRow
      display="columnCompressed"
      label={
        <>
          {i18n.translate('xpack.lens.metricChart.metricSizeLabel', {
            defaultMessage: 'Size',
          })}
        </>
      }
    >
      <EuiSuperSelect
        data-test-subj="lnsMetricSizeSelect"
        compressed
        options={titleSizes.map((position) => {
          return {
            value: position.id,
            dropdownDisplay: position.label,
            inputDisplay: position.label,
          };
        })}
        valueOfSelected={state.size ?? 'xl'}
        onChange={(value) => {
          setState({ ...state, size: value });
        }}
        itemLayoutAlign="top"
        hasDividers
      />
    </EuiFormRow>
  );
};
