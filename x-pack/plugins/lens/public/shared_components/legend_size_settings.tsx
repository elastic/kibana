/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFormRow, EuiSuperSelect } from '@elastic/eui';
import { LegendSizes } from '../../common';

interface LegendSizeSettingsProps {
  legendSize: number | undefined;
  onLegendSizeChange: (size?: number) => void;
  isVerticalLegend: boolean;
}

const legendSizeOptions: Array<{ value: string; inputDisplay: string }> = [
  {
    value: LegendSizes.SMALL.toString(),
    inputDisplay: i18n.translate('xpack.lens.shared.legendSizeSetting.legendSizeOptions.small', {
      defaultMessage: 'Small',
    }),
  },
  {
    value: LegendSizes.MEDIUM.toString(),
    inputDisplay: i18n.translate('xpack.lens.shared.legendSizeSetting.legendSizeOptions.medium', {
      defaultMessage: 'Medium',
    }),
  },
  {
    value: LegendSizes.LARGE.toString(),
    inputDisplay: i18n.translate('xpack.lens.shared.legendSizeSetting.legendSizeOptions.large', {
      defaultMessage: 'Large',
    }),
  },
  {
    value: LegendSizes.EXTRA_LARGE.toString(),
    inputDisplay: i18n.translate(
      'xpack.lens.shared.legendSizeSetting.legendSizeOptions.extraLarge',
      {
        defaultMessage: 'Extra large',
      }
    ),
  },
];

export const LegendSizeSettings = ({
  legendSize,
  onLegendSizeChange,
  isVerticalLegend,
}: LegendSizeSettingsProps) => {
  useEffect(() => {
    if (legendSize && !isVerticalLegend) {
      onLegendSizeChange(undefined);
    }
  }, [isVerticalLegend, legendSize, onLegendSizeChange]);

  const onLegendSizeOptionChange = useCallback(
    (option: string) => onLegendSizeChange(Number(option)),
    [onLegendSizeChange]
  );

  if (!isVerticalLegend) return null;

  // undefined means auto. should only be the case for pre 8.3 visualizations
  const currentSize = typeof legendSize === 'undefined' ? LegendSizes.AUTO : legendSize;

  const options =
    currentSize !== LegendSizes.AUTO
      ? legendSizeOptions
      : [
          {
            value: LegendSizes.AUTO.toString(),
            inputDisplay: i18n.translate(
              'xpack.lens.shared.legendSizeSetting.legendSizeOptions.auto',
              {
                defaultMessage: 'Auto',
              }
            ),
          },
          ...legendSizeOptions,
        ];

  return (
    <EuiFormRow
      display="columnCompressed"
      label={i18n.translate('xpack.lens.shared.legendSizeSetting.label', {
        defaultMessage: 'Legend width',
      })}
      fullWidth
    >
      <EuiSuperSelect
        compressed
        valueOfSelected={currentSize.toString()}
        options={options}
        onChange={onLegendSizeOptionChange}
      />
    </EuiFormRow>
  );
};
