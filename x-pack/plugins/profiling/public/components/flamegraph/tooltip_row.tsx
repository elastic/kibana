/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem, EuiText, EuiTextColor } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { isNumber } from 'lodash';
import React from 'react';
import { asPercentage } from '../../utils/formatters/as_percentage';

export function TooltipRow({
  value,
  label,
  comparison,
  formatDifferenceAsPercentage,
  showDifference,
  formatValue,
  prependValue = '',
}: {
  value: number;
  label: string | React.ReactElement;
  comparison?: number;
  formatDifferenceAsPercentage: boolean;
  showDifference: boolean;
  formatValue?: (value: number) => string;
  prependValue?: string;
}) {
  const valueLabel = `${prependValue}${
    formatValue ? formatValue(Math.abs(value)) : value.toString()
  }`;
  const comparisonLabel =
    formatValue && isNumber(comparison) ? formatValue(comparison) : comparison?.toString();

  let diff: number | undefined;
  let diffLabel = '';
  let color = '';

  if (isNumber(comparison)) {
    if (showDifference) {
      color = value < comparison ? 'danger' : 'success';
      if (formatDifferenceAsPercentage) {
        // CPU percent values
        diff = comparison - value;
        diffLabel =
          '(' + (diff > 0 ? '+' : diff < 0 ? '-' : '') + asPercentage(Math.abs(diff)) + ')';
      } else {
        // Sample counts
        diff = 1 - comparison / value;
        diffLabel =
          '(' + (diff > 0 ? '-' : diff < 0 ? '+' : '') + asPercentage(Math.abs(diff)) + ')';
      }
      if (Math.abs(diff) < 0.0001) {
        diffLabel = '';
      }
    }
  }

  return (
    <EuiFlexItem>
      <EuiFlexGroup direction="row" gutterSize="xs">
        <EuiFlexItem grow={false}>
          <EuiText size="xs">
            <strong style={{ display: 'flex' }}>{label}:</strong>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText size="xs">
            {comparison !== undefined
              ? i18n.translate('xpack.profiling.flameGraphTooltip.valueLabel', {
                  defaultMessage: `{value} vs {comparison}`,
                  values: {
                    value: valueLabel,
                    comparison: comparisonLabel,
                  },
                })
              : valueLabel}
            <EuiTextColor color={color}> {diffLabel}</EuiTextColor>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexItem>
  );
}
