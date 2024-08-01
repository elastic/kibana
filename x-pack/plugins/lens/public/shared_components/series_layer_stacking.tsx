/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButtonGroup, EuiFormRow } from '@elastic/eui';
import { SeriesType } from '../visualizations/xy/xy_visualization';

type BarStackingOption =
  | 'bar_stacking_unstacked'
  | 'bar_stacking_stacked'
  | 'bar_stacking_percentage';

export const barStackingOptions: Array<{
  id: string;
  value: BarStackingOption;
  label: string;
  subtypes: string[];
}> = [
  {
    id: 'bar_stacking_stacked',
    value: 'bar_stacking_stacked',
    label: i18n.translate('xpack.lens.shared.barLayerStacking.stacked', {
      defaultMessage: 'Stacked',
    }),
    subtypes: ['bar_stacked', 'area_stacked', 'bar_horizontal_stacked'],
  },
  {
    id: 'bar_stacking_unstacked',
    value: 'bar_stacking_unstacked',
    label: i18n.translate('xpack.lens.shared.barLayerStacking.unstacked', {
      defaultMessage: 'Unstacked',
    }),
    subtypes: ['bar', 'area', 'bar_horizontal'],
  },
  {
    id: 'bar_stacking_percentage',
    value: 'bar_stacking_percentage',
    label: i18n.translate('xpack.lens.shared.barLayerStacking.percentage', {
      defaultMessage: 'Percentage',
    }),
    subtypes: [
      'bar_percentage_stacked',
      'area_percentage_stacked',
      'bar_horizontal_percentage_stacked',
    ],
  },
];

export const getBarStackingType = (seriesType: string): BarStackingOption => {
  return (
    barStackingOptions.find(({ subtypes }) => subtypes.includes(seriesType))?.value ??
    'bar_stacking_unstacked'
  );
};

export interface SeriesStackingSettingProps {
  isVisible?: boolean;
  seriesType: SeriesType;
  onSeriesType: (newSeriesType: string) => void;
  label?: string;
}

const defaultLabel = i18n.translate('xpack.lens.shared.barStacking', {
  defaultMessage: 'Bar layer stacking',
});

export const SeriesStackingSetting: FC<SeriesStackingSettingProps> = ({
  isVisible = true,
  seriesType,
  onSeriesType,
  label = defaultLabel,
}) => {
  if (!isVisible) {
    return null;
  }

  const idSelected = getBarStackingType(seriesType);

  return (
    <EuiFormRow display="columnCompressed" label={label} fullWidth>
      <EuiButtonGroup
        isFullWidth
        legend={label}
        data-test-subj="lens-bar-layer-stacking"
        buttonSize="compressed"
        options={barStackingOptions}
        idSelected={idSelected}
        onChange={(modeId) => {
          const currentOption = barStackingOptions.find(({ id }) => id === idSelected);
          const currentOptionIndex = currentOption?.subtypes.indexOf(seriesType);
          const selectedOption = barStackingOptions.find(({ id }) => id === modeId);
          if (!selectedOption || currentOptionIndex === undefined || currentOptionIndex < 0) {
            return;
          }
          onSeriesType(selectedOption?.subtypes[currentOptionIndex]);
        }}
      />
    </EuiFormRow>
  );
};
