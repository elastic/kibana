/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFormRow, EuiSuperSelect } from '@elastic/eui';
import { DEFAULT_LEGEND_SIZE, LegendSize } from '@kbn/visualizations-plugin/public';

interface LegendSizeSettingsProps {
  legendSize?: LegendSize;
  onLegendSizeChange: (size?: LegendSize) => void;
  isVerticalLegend: boolean;
  showAutoOption: boolean;
}

const legendSizeOptions: Array<{ value: LegendSize; inputDisplay: string }> = [
  {
    value: LegendSize.SMALL,
    inputDisplay: i18n.translate('xpack.lens.shared.legendSizeSetting.legendSizeOptions.small', {
      defaultMessage: 'Small',
    }),
  },
  {
    value: LegendSize.MEDIUM,
    inputDisplay: i18n.translate('xpack.lens.shared.legendSizeSetting.legendSizeOptions.medium', {
      defaultMessage: 'Medium',
    }),
  },
  {
    value: LegendSize.LARGE,
    inputDisplay: i18n.translate('xpack.lens.shared.legendSizeSetting.legendSizeOptions.large', {
      defaultMessage: 'Large',
    }),
  },
  {
    value: LegendSize.EXTRA_LARGE,
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
  showAutoOption,
}: LegendSizeSettingsProps) => {
  useEffect(() => {
    if (legendSize && !isVerticalLegend) {
      onLegendSizeChange(undefined);
    }
  }, [isVerticalLegend, legendSize, onLegendSizeChange]);

  const onLegendSizeOptionChange = useCallback(
    (option: LegendSize) => onLegendSizeChange(option === DEFAULT_LEGEND_SIZE ? undefined : option),
    [onLegendSizeChange]
  );

  if (!isVerticalLegend) return null;

  const options = showAutoOption
    ? [
        {
          value: LegendSize.AUTO,
          inputDisplay: i18n.translate(
            'xpack.lens.shared.legendSizeSetting.legendSizeOptions.auto',
            {
              defaultMessage: 'Auto',
            }
          ),
        },
        ...legendSizeOptions,
      ]
    : legendSizeOptions;

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
        valueOfSelected={legendSize ?? DEFAULT_LEGEND_SIZE}
        options={options}
        onChange={onLegendSizeOptionChange}
      />
    </EuiFormRow>
  );
};
