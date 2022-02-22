/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiFieldNumber, EuiFlexGroup, EuiFlexItem, EuiFormRow, EuiIconTip } from '@elastic/eui';
import { TooltipWrapper } from './tooltip_wrapper';

interface LegendSizeSettingsProps {
  legendSize: number | undefined;
  onLegendSizeChange: (size?: number) => void;
  isDisabled: boolean;
}

export const LegendSizeSettings = ({
  legendSize,
  onLegendSizeChange,
  isDisabled,
}: LegendSizeSettingsProps) => (
  <EuiFormRow
    display="columnCompressed"
    label={i18n.translate('xpack.lens.shared.legendSizeSetting.label', {
      defaultMessage: 'Legend size',
    })}
  >
    <TooltipWrapper
      tooltipContent={i18n.translate('xpack.lens.shared.legendVisibleTooltip', {
        defaultMessage: 'Requires legend to be shown',
      })}
      condition={isDisabled}
      position="top"
      delay="regular"
      display="block"
    >
      <EuiFlexGroup gutterSize="s" alignItems="center">
        <EuiFlexItem>
          <EuiFieldNumber
            placeholder={i18n.translate('xpack.lens.shared.legendSizeSetting.placeholder', {
              defaultMessage: 'Auto',
            })}
            value={legendSize}
            min={1}
            step={1}
            compressed
            disabled={isDisabled}
            onChange={(e) => {
              const value = Number(e.target.value) || undefined;
              onLegendSizeChange(value);
            }}
            append={i18n.translate('xpack.lens.shared.legendSizeSetting.fieldAppend', {
              defaultMessage: 'px',
            })}
          />
        </EuiFlexItem>
        {!isDisabled && (
          <EuiFlexItem grow={false}>
            <EuiIconTip
              type="questionInCircle"
              content={
                <FormattedMessage
                  id="xpack.lens.shared.legendSizeSetting.tooltip"
                  defaultMessage="Limited to max of 70% of the chart container.
                  Vertical legends limited to min of 30% of chart width."
                />
              }
            />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </TooltipWrapper>
  </EuiFormRow>
);
