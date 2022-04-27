/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButtonGroup, EuiFormRow } from '@elastic/eui';
import type { MetricState } from '../../../common/types';

export interface TitlePositionProps {
  state: MetricState;
  setState: (newState: MetricState) => void;
}

export const DEFAULT_TITLE_POSITION = 'top';

const titlePositions = [
  {
    id: 'top',
    label: i18n.translate('xpack.lens.metricChart.titlePositions.top', { defaultMessage: 'Top' }),
  },
  {
    id: 'bottom',
    label: i18n.translate('xpack.lens.metricChart.titlePositions.bottom', {
      defaultMessage: 'Bottom',
    }),
  },
];

export const TitlePositionOptions: React.FC<TitlePositionProps> = ({ state, setState }) => {
  return (
    <EuiFormRow
      display="columnCompressed"
      fullWidth
      label={
        <>
          {i18n.translate('xpack.lens.metricChart.titlePositionLabel', {
            defaultMessage: 'Title position',
          })}
        </>
      }
    >
      <EuiButtonGroup
        isFullWidth={true}
        data-test-subj="lnsMissingValuesSelect"
        legend="This is a basic group"
        options={titlePositions}
        idSelected={state.titlePosition ?? DEFAULT_TITLE_POSITION}
        onChange={(value) => {
          setState({ ...state, titlePosition: value as MetricState['titlePosition'] });
        }}
        buttonSize="compressed"
      />
    </EuiFormRow>
  );
};
