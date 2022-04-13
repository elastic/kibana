/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiFormRow,
  EuiButtonGroup,
  EuiSwitch,
  EuiSwitchEvent,
  EuiFieldNumber,
} from '@elastic/eui';
import { Position, VerticalAlignment, HorizontalAlignment } from '@elastic/charts';
import { ToolbarPopover } from '../shared_components';
import { LegendLocationSettings } from './legend_location_settings';
import { ColumnsNumberSetting } from './columns_number_setting';
import { LegendSizeSettings } from './legend_size_settings';
import { ToolbarButtonProps } from '../../../../../src/plugins/kibana_react/public';
import { TooltipWrapper } from './tooltip_wrapper';
import { useDebouncedValue } from './debounced_value';

export interface LegendSettingsPopoverProps {
  /**
   * Determines the legend display options
   */
  legendOptions: Array<{
    id: string;
    value: 'auto' | 'show' | 'hide' | 'default';
    label: string;
  }>;
  /**
   * Determines the legend mode
   */
  mode: 'default' | 'show' | 'hide' | 'auto';
  /**
   * Callback on display option change
   */
  onDisplayChange: (id: string) => void;
  /**
   * Sets the legend position
   */
  position?: Position;
  /**
   * Callback on position option change
   */
  onPositionChange: (id: string) => void;
  /**
   * Determines the legend location
   */
  location?: 'inside' | 'outside';
  /**
   * Callback on location option change
   */
  onLocationChange?: (id: string) => void;
  /**
   * Sets the vertical alignment for legend inside chart
   */
  verticalAlignment?: VerticalAlignment;
  /**
   * Sets the vertical alignment for legend inside chart
   */
  horizontalAlignment?: HorizontalAlignment;
  /**
   * Callback on horizontal alignment option change
   */
  onAlignmentChange?: (id: string) => void;
  /**
   * Sets the number of columns for legend inside chart
   */
  floatingColumns?: number;
  /**
   * Callback on alignment option change
   */
  onFloatingColumnsChange?: (value: number) => void;
  /**
   * Sets the number of lines per legend item
   */
  maxLines?: number;
  /**
   * Callback on max lines option change
   */
  onMaxLinesChange?: (value: number) => void;
  /**
   * Defines if the legend items will be truncated or not
   */
  shouldTruncate?: boolean;
  /**
   * Callback on nested switch status change
   */
  onTruncateLegendChange?: (event: EuiSwitchEvent) => void;
  /**
   * If true, nested legend switch is rendered
   */
  renderNestedLegendSwitch?: boolean;
  /**
   * nested legend switch status
   */
  nestedLegend?: boolean;
  /**
   * Callback on nested switch status change
   */
  onNestedLegendChange?: (event: EuiSwitchEvent) => void;
  /**
   * value in legend status
   */
  valueInLegend?: boolean;
  /**
   * Callback on value in legend status change
   */
  onValueInLegendChange?: (event: EuiSwitchEvent) => void;
  /**
   * If true, value in legend switch is rendered
   */
  renderValueInLegendSwitch?: boolean;
  /**
   * Button group position
   */
  groupPosition?: ToolbarButtonProps['groupPosition'];
  /**
   * Legend size in pixels
   */
  legendSize?: number;
  /**
   * Callback on legend size change
   */
  onLegendSizeChange: (size?: number) => void;
}

const DEFAULT_TRUNCATE_LINES = 1;
const MAX_TRUNCATE_LINES = 5;
const MIN_TRUNCATE_LINES = 1;

export const MaxLinesInput = ({
  value,
  setValue,
  isDisabled,
}: {
  value: number;
  setValue: (value: number) => void;
  isDisabled: boolean;
}) => {
  const { inputValue, handleInputChange } = useDebouncedValue({ value, onChange: setValue });
  return (
    <EuiFieldNumber
      data-test-subj="lens-legend-max-lines-input"
      value={inputValue}
      min={MIN_TRUNCATE_LINES}
      max={MAX_TRUNCATE_LINES}
      step={1}
      compressed
      disabled={isDisabled}
      onChange={(e) => {
        const val = Number(e.target.value);
        // we want to automatically change the values to the limits
        // if the user enters a value that is outside the limits
        handleInputChange(Math.min(MAX_TRUNCATE_LINES, Math.max(val, MIN_TRUNCATE_LINES)));
      }}
    />
  );
};

export const LegendSettingsPopover: React.FunctionComponent<LegendSettingsPopoverProps> = ({
  legendOptions,
  mode,
  onDisplayChange,
  position,
  location,
  onLocationChange = () => {},
  verticalAlignment,
  horizontalAlignment,
  floatingColumns,
  onAlignmentChange = () => {},
  onFloatingColumnsChange = () => {},
  onPositionChange,
  renderNestedLegendSwitch,
  nestedLegend,
  onNestedLegendChange = () => {},
  valueInLegend,
  onValueInLegendChange = () => {},
  renderValueInLegendSwitch,
  groupPosition = 'right',
  maxLines,
  onMaxLinesChange = () => {},
  shouldTruncate,
  onTruncateLegendChange = () => {},
  legendSize,
  onLegendSizeChange,
}) => {
  return (
    <ToolbarPopover
      title={i18n.translate('xpack.lens.shared.legendLabel', {
        defaultMessage: 'Legend',
      })}
      type="legend"
      groupPosition={groupPosition}
      buttonDataTestSubj="lnsLegendButton"
    >
      <EuiFormRow
        display="columnCompressed"
        label={i18n.translate('xpack.lens.shared.legendVisibilityLabel', {
          defaultMessage: 'Display',
        })}
      >
        <EuiButtonGroup
          isFullWidth
          legend={i18n.translate('xpack.lens.shared.legendVisibilityLabel', {
            defaultMessage: 'Display',
          })}
          data-test-subj="lens-legend-display-btn"
          name="legendDisplay"
          buttonSize="compressed"
          options={legendOptions}
          idSelected={legendOptions.find(({ value }) => value === mode)!.id}
          onChange={onDisplayChange}
        />
      </EuiFormRow>
      <LegendLocationSettings
        location={location}
        onLocationChange={onLocationChange}
        verticalAlignment={verticalAlignment}
        horizontalAlignment={horizontalAlignment}
        onAlignmentChange={onAlignmentChange}
        isDisabled={mode === 'hide'}
        position={position}
        onPositionChange={onPositionChange}
      />
      <LegendSizeSettings
        legendSize={legendSize}
        onLegendSizeChange={onLegendSizeChange}
        isVerticalLegend={!position || position === Position.Left || position === Position.Right}
        isDisabled={mode === 'hide' || location === 'inside'}
      />
      {location && (
        <ColumnsNumberSetting
          floatingColumns={floatingColumns}
          onFloatingColumnsChange={onFloatingColumnsChange}
          isDisabled={mode === 'hide'}
          isLegendOutside={location === 'outside'}
        />
      )}
      <EuiFormRow
        display="columnCompressedSwitch"
        label={i18n.translate('xpack.lens.shared.truncateLegend', {
          defaultMessage: 'Truncate text',
        })}
      >
        <TooltipWrapper
          tooltipContent={i18n.translate('xpack.lens.shared.legendVisibleTooltip', {
            defaultMessage: 'Requires legend to be shown',
          })}
          condition={mode === 'hide'}
          position="top"
          delay="regular"
          display="block"
        >
          <EuiSwitch
            compressed
            label={i18n.translate('xpack.lens.shared.truncateLegend', {
              defaultMessage: 'Truncate text',
            })}
            data-test-subj="lens-legend-truncate-switch"
            showLabel={false}
            disabled={mode === 'hide'}
            checked={shouldTruncate ?? true}
            onChange={onTruncateLegendChange}
          />
        </TooltipWrapper>
      </EuiFormRow>
      <EuiFormRow
        label={i18n.translate('xpack.lens.shared.maxLinesLabel', {
          defaultMessage: 'Maximum lines',
        })}
        fullWidth
        display="columnCompressed"
      >
        <TooltipWrapper
          tooltipContent={
            mode === 'hide'
              ? i18n.translate('xpack.lens.shared.legendVisibleTooltip', {
                  defaultMessage: 'Requires legend to be shown',
                })
              : i18n.translate('xpack.lens.shared.legendIsTruncated', {
                  defaultMessage: 'Requires text to be truncated',
                })
          }
          condition={mode === 'hide' || !shouldTruncate}
          position="top"
          delay="regular"
          display="block"
        >
          <MaxLinesInput
            value={maxLines ?? DEFAULT_TRUNCATE_LINES}
            setValue={onMaxLinesChange}
            isDisabled={mode === 'hide' || !shouldTruncate}
          />
        </TooltipWrapper>
      </EuiFormRow>
      {renderNestedLegendSwitch && (
        <EuiFormRow
          display="columnCompressedSwitch"
          label={i18n.translate('xpack.lens.shared.nestedLegendLabel', {
            defaultMessage: 'Nested',
          })}
        >
          <TooltipWrapper
            tooltipContent={i18n.translate('xpack.lens.shared.legendVisibleTooltip', {
              defaultMessage: 'Requires legend to be shown',
            })}
            condition={mode === 'hide'}
            position="top"
            delay="regular"
            display="block"
          >
            <EuiSwitch
              compressed
              label={i18n.translate('xpack.lens.pieChart.nestedLegendLabel', {
                defaultMessage: 'Nested',
              })}
              data-test-subj="lens-legend-nested-switch"
              showLabel={false}
              disabled={mode === 'hide'}
              checked={!!nestedLegend}
              onChange={onNestedLegendChange}
            />
          </TooltipWrapper>
        </EuiFormRow>
      )}
      {renderValueInLegendSwitch && (
        <EuiFormRow
          display="columnCompressedSwitch"
          label={i18n.translate('xpack.lens.shared.valueInLegendLabel', {
            defaultMessage: 'Show value',
          })}
        >
          <TooltipWrapper
            tooltipContent={i18n.translate('xpack.lens.shared.legendVisibleTooltip', {
              defaultMessage: 'Requires legend to be shown',
            })}
            condition={mode === 'hide'}
            position="top"
            delay="regular"
            display="block"
          >
            <EuiSwitch
              compressed
              label={i18n.translate('xpack.lens.shared.valueInLegendLabel', {
                defaultMessage: 'Show value',
              })}
              data-test-subj="lens-legend-show-value"
              showLabel={false}
              disabled={mode === 'hide'}
              checked={!!valueInLegend}
              onChange={onValueInLegendChange}
            />
          </TooltipWrapper>
        </EuiFormRow>
      )}
    </ToolbarPopover>
  );
};
