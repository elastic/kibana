/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiFieldNumber,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIconTip,
  EuiSwitch,
} from '@elastic/eui';
import { TooltipWrapper } from './tooltip_wrapper';

interface LegendSizeSettingsProps {
  legendSize: number | undefined;
  onLegendSizeChange: (size?: number) => void;
  isVerticalLegend: boolean;
  isDisabled: boolean;
}

const MIN_SIZE_VALUE = 1;
const DEFAULT_SIZE_VALUE = 100;

const WIDTH_LABEL = i18n.translate('xpack.lens.shared.legendSizeSetting.labelWidth', {
  defaultMessage: 'width',
});

const HEIGHT_LABEL = i18n.translate('xpack.lens.shared.legendSizeSetting.labelHeight', {
  defaultMessage: 'height',
});

const VERTICAL_TOOLTIP_LABEL = i18n.translate(
  'xpack.lens.shared.legendSizeSetting.tooltipLabelTVertical',
  {
    defaultMessage:
      'Vertical legends have minimum of 30% and maximum of 70% of the visualization container width.',
  }
);

const HORIZONTAL_TOOLTIP_LABEL = i18n.translate(
  'xpack.lens.shared.legendSizeSetting.tooltipLabelHorizontal',
  {
    defaultMessage: 'Horizontal legends have maximum of 70% of the visualization height.',
  }
);

export const LegendSizeSettings = ({
  legendSize,
  onLegendSizeChange,
  isVerticalLegend,
  isDisabled,
}: LegendSizeSettingsProps) => {
  const sizeProperty = isVerticalLegend ? WIDTH_LABEL : HEIGHT_LABEL;
  const autoSizeLabel = i18n.translate('xpack.lens.shared.legendSizeSetting.switch', {
    defaultMessage: 'Auto {sizeProperty}',
    values: { sizeProperty },
  });

  const [inputValue, setInputValue] = useState(legendSize ?? DEFAULT_SIZE_VALUE);
  const [isAutoSizeEnabled, setIsAutoSizeEnabled] = useState(!legendSize);

  const handleAutoSizeChange = useCallback(() => {
    const shouldUseAutoSize = !isAutoSizeEnabled;
    setIsAutoSizeEnabled(shouldUseAutoSize);
    onLegendSizeChange(shouldUseAutoSize ? undefined : inputValue);
  }, [onLegendSizeChange, inputValue, isAutoSizeEnabled]);

  const handleLegendSizeChange = useCallback(
    (e) => {
      const value = Math.max(Number(e.target.value), MIN_SIZE_VALUE);
      setInputValue(value);
      onLegendSizeChange(value);
    },
    [onLegendSizeChange]
  );

  return (
    <>
      <EuiFormRow display="columnCompressedSwitch" label={autoSizeLabel}>
        <TooltipWrapper
          tooltipContent={i18n.translate('xpack.lens.shared.legendVisibleTooltip', {
            defaultMessage: 'Requires legend to be shown',
          })}
          condition={isDisabled}
          position="top"
          delay="regular"
          display="block"
        >
          <EuiSwitch
            compressed
            showLabel={false}
            disabled={isDisabled}
            label={autoSizeLabel}
            checked={isAutoSizeEnabled}
            onChange={handleAutoSizeChange}
          />
        </TooltipWrapper>
      </EuiFormRow>
      <EuiFormRow
        display="columnCompressed"
        label={
          <EuiFlexGroup gutterSize="xs" alignItems="baseline" responsive={false}>
            <EuiFlexItem>
              <FormattedMessage
                id="xpack.lens.shared.legendSizeSetting.label"
                defaultMessage="Legend {sizeProperty}"
                values={{ sizeProperty }}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiIconTip
                type="questionInCircle"
                size="s"
                content={isVerticalLegend ? VERTICAL_TOOLTIP_LABEL : HORIZONTAL_TOOLTIP_LABEL}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        }
      >
        <TooltipWrapper
          tooltipContent={
            isAutoSizeEnabled
              ? i18n.translate('xpack.lens.shared.legendIsTruncated', {
                  defaultMessage: 'Requires legend auto {sizeProperty} to be disabled',
                  values: { sizeProperty },
                })
              : i18n.translate('xpack.lens.shared.legendVisibleTooltip', {
                  defaultMessage: 'Requires legend to be shown',
                })
          }
          condition={isAutoSizeEnabled || isDisabled}
          position="top"
          delay="regular"
          display="block"
        >
          <EuiFieldNumber
            min={MIN_SIZE_VALUE}
            step={1}
            compressed
            disabled={isAutoSizeEnabled || isDisabled}
            value={legendSize ?? inputValue}
            onChange={handleLegendSizeChange}
            append={i18n.translate('xpack.lens.shared.legendSizeSetting.fieldAppend', {
              defaultMessage: 'px',
            })}
          />
        </TooltipWrapper>
      </EuiFormRow>
    </>
  );
};
