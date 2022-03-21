/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButtonIcon, EuiSuperSelect } from '@elastic/eui';
import type { MetricState } from '../../../common/types';

export interface TitlePositionProps {
  state: MetricState;
  setState: (newState: MetricState) => void;
}

const titleSizes = [
  {
    id: 'xs',
    label: i18n.translate('xpack.lens.metricChart.metricSize.extraSmall', {
      defaultMessage: 'XS',
    }),
  },
  {
    id: 's',
    label: i18n.translate('xpack.lens.metricChart.metricSize.small', {
      defaultMessage: 'S',
    }),
  },
  {
    id: 'm',
    label: i18n.translate('xpack.lens.metricChart.metricSize.medium', {
      defaultMessage: 'M',
    }),
  },
  {
    id: 'l',
    label: i18n.translate('xpack.lens.metricChart.metricSize.large', {
      defaultMessage: 'L',
    }),
  },
  {
    id: 'xl',
    label: i18n.translate('xpack.lens.metricChart.metricSize.extraLarge', {
      defaultMessage: 'XL',
    }),
  },
  {
    id: 'xxl',
    label: i18n.translate('xpack.lens.metricChart.metricSize.xxl', {
      defaultMessage: 'XXL',
    }),
  },
];

export const SizeOptions: React.FC<TitlePositionProps> = ({ state, setState }) => {
  const currSizeIndex = titleSizes.findIndex((size) => size.id === (state.size || 'xl'));

  const changeSize = (change: number) => {
    setState({ ...state, size: titleSizes[currSizeIndex + change].id });
  };

  return (
    <EuiSuperSelect
      append={
        <EuiButtonIcon
          iconType="plus"
          onClick={() => changeSize(1)}
          isDisabled={currSizeIndex === titleSizes.length - 1}
        />
      }
      prepend={
        <EuiButtonIcon
          iconType="minus"
          onClick={() => changeSize(-1)}
          isDisabled={currSizeIndex === 0}
        />
      }
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
      fullWidth
    />
  );
};
