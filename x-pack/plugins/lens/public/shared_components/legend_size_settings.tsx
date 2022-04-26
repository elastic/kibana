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

interface LegendSizeSettingsProps {
  legendSize: number | undefined;
  onLegendSizeChange: (size?: number) => void;
  isVerticalLegend: boolean;
}

const legendSizeOptions: Array<{ value: LegendSizes; inputDisplay: string }> = [
  {
    value: LegendSizes.AUTO,
    inputDisplay: i18n.translate('xpack.lens.shared.legendSizeSetting.legendSizeOptions.auto', {
      defaultMessage: 'Auto',
    }),
  },
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
    (option) => onLegendSizeChange(Number(option) || undefined),
    [onLegendSizeChange]
  );

  if (!isVerticalLegend) return null;

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
        valueOfSelected={legendSize?.toString() ?? LegendSizes.AUTO}
        options={legendSizeOptions}
        onChange={onLegendSizeOptionChange}
      />
    </EuiFormRow>
  );
};
