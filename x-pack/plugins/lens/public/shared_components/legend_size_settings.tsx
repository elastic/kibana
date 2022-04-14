/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFormRow, EuiSuperSelect } from '@elastic/eui';

export enum LegendSizes {
  AUTO = '0',
  SMALL = '80',
  MEDIUM = '130',
  LARGE = '180',
  EXTRA_LARGE = '230',
}

export const DEFAULT_LEGEND_SIZE = LegendSizes.MEDIUM;

interface LegendSizeSettingsProps {
  legendSize: number | undefined;
  onLegendSizeChange: (size?: number) => void;
  isVerticalLegend: boolean;
}

const legendSizeOptions: Array<{ value: LegendSizes; inputDisplay: string }> = [
  {
    value: LegendSizes.SMALL,
    inputDisplay: i18n.translate('xpack.lens.shared.legendSizeSetting.legendSizeOptions.small', {
      defaultMessage: 'Small',
    }),
  },
  {
    value: LegendSizes.MEDIUM,
    inputDisplay: i18n.translate('xpack.lens.shared.legendSizeSetting.legendSizeOptions.medium', {
      defaultMessage: 'Medium',
    }),
  },
  {
    value: LegendSizes.LARGE,
    inputDisplay: i18n.translate('xpack.lens.shared.legendSizeSetting.legendSizeOptions.large', {
      defaultMessage: 'Large',
    }),
  },
  {
    value: LegendSizes.EXTRA_LARGE,
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
    (option) => onLegendSizeChange(option === DEFAULT_LEGEND_SIZE ? undefined : Number(option)),
    [onLegendSizeChange]
  );

  if (!isVerticalLegend) return null;

  const options =
    legendSize?.toString() !== LegendSizes.AUTO
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
        valueOfSelected={legendSize?.toString() || DEFAULT_LEGEND_SIZE}
        options={options}
        onChange={onLegendSizeOptionChange}
      />
    </EuiFormRow>
  );
};
