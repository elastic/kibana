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
  EuiFlexItem,
  EuiFlexGroup,
} from '@elastic/eui';
import { Position, VerticalAlignment, HorizontalAlignment } from '@elastic/charts';
import { LegendSize } from '@kbn/visualizations-plugin/public';
import { useDebouncedValue } from '@kbn/visualization-ui-components';
import { XYLegendValue } from '@kbn/visualizations-plugin/common/constants';
import { ToolbarPopover, type ToolbarPopoverProps } from '../toolbar_popover';
import { LegendLocationSettings } from './location/legend_location_settings';
import { ColumnsNumberSetting } from './layout/columns_number_setting';
import { LegendSizeSettings } from './size/legend_size_settings';

export interface LegendSettingsPopoverProps<S = XYLegendValue> {
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
  verticalAlignment?: typeof VerticalAlignment.Top | typeof VerticalAlignment.Bottom;
  /**
   * Sets the vertical alignment for legend inside chart
   */
  horizontalAlignment?: typeof HorizontalAlignment.Left | typeof HorizontalAlignment.Right;
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
  legendStats?: S[];
  /**
   * Callback on value in legend status change
   */
  onLegendStatsChange?: (checked?: boolean) => void;
  /**
   * If true, value in legend switch is rendered
   */
  allowLegendStats?: boolean;
  /**
   * Button group position
   */
  groupPosition?: ToolbarPopoverProps['groupPosition'];
  /**
   * Legend size in pixels
   */
  legendSize?: LegendSize;
  /**
   * Callback on legend size change
   */
  onLegendSizeChange: (size?: LegendSize) => void;
  /**
   * Whether to show auto legend size option. Should only be true for pre 8.3 visualizations that already had it as their setting.
   * (We're trying to get people to stop using it so it can eventually be removed.)
   */
  showAutoLegendSizeOption: boolean;
}

const DEFAULT_TRUNCATE_LINES = 1;
const MAX_TRUNCATE_LINES = 5;
const MIN_TRUNCATE_LINES = 1;

export const MaxLinesInput = ({
  value,
  setValue,
  disabled,
}: {
  value: number;
  setValue: (value: number) => void;
  disabled?: boolean;
}) => {
  const { inputValue, handleInputChange } = useDebouncedValue({ value, onChange: setValue });
  return (
    <EuiFieldNumber
      disabled={disabled}
      fullWidth
      prepend={i18n.translate('xpack.lens.shared.maxLinesLabel', {
        defaultMessage: 'Line limit',
      })}
      aria-label={i18n.translate('xpack.lens.shared.maxLinesLabel', {
        defaultMessage: 'Line limit',
      })}
      data-test-subj="lens-legend-max-lines-input"
      value={inputValue}
      min={MIN_TRUNCATE_LINES}
      max={MAX_TRUNCATE_LINES}
      step={1}
      compressed
      onChange={(e) => {
        const val = Number(e.target.value);
        // we want to automatically change the values to the limits
        // if the user enters a value that is outside the limits
        handleInputChange(Math.min(MAX_TRUNCATE_LINES, Math.max(val, MIN_TRUNCATE_LINES)));
      }}
    />
  );
};

const noop = () => {};
const PANEL_STYLE = {
  width: '500px',
};

export function LegendSettingsPopover<T = XYLegendValue>({
  legendOptions,
  mode,
  onDisplayChange,
  position,
  location,
  onLocationChange = noop,
  verticalAlignment,
  horizontalAlignment,
  floatingColumns,
  onAlignmentChange = noop,
  onFloatingColumnsChange = noop,
  onPositionChange,
  renderNestedLegendSwitch,
  nestedLegend,
  onNestedLegendChange = noop,
  legendStats,
  onLegendStatsChange = noop,
  allowLegendStats,
  groupPosition = 'right',
  maxLines,
  onMaxLinesChange = noop,
  shouldTruncate,
  onTruncateLegendChange = noop,
  legendSize,
  onLegendSizeChange,
  showAutoLegendSizeOption,
}: LegendSettingsPopoverProps<T>) {
  return (
    <ToolbarPopover
      title={i18n.translate('xpack.lens.shared.legendLabel', {
        defaultMessage: 'Legend',
      })}
      type="legend"
      groupPosition={groupPosition}
      buttonDataTestSubj="lnsLegendButton"
      panelStyle={PANEL_STYLE}
    >
      <EuiFormRow
        display="columnCompressed"
        label={i18n.translate('xpack.lens.shared.legendVisibilityLabel', {
          defaultMessage: 'Display',
        })}
        fullWidth
      >
        <EuiButtonGroup
          isFullWidth
          legend={i18n.translate('xpack.lens.shared.legendVisibilityLabel', {
            defaultMessage: 'Display',
          })}
          data-test-subj="lens-legend-display-btn"
          buttonSize="compressed"
          options={legendOptions}
          idSelected={legendOptions.find(({ value }) => value === mode)!.id}
          onChange={onDisplayChange}
        />
      </EuiFormRow>
      {mode !== 'hide' && (
        <>
          <LegendLocationSettings
            location={location}
            onLocationChange={onLocationChange}
            verticalAlignment={verticalAlignment}
            horizontalAlignment={horizontalAlignment}
            onAlignmentChange={onAlignmentChange}
            position={position}
            onPositionChange={onPositionChange}
          />
          {location !== 'inside' && (
            <LegendSizeSettings
              legendSize={legendSize}
              onLegendSizeChange={onLegendSizeChange}
              isVerticalLegend={
                !position || position === Position.Left || position === Position.Right
              }
              showAutoOption={showAutoLegendSizeOption}
            />
          )}
          {location && (
            <ColumnsNumberSetting
              floatingColumns={floatingColumns}
              onFloatingColumnsChange={onFloatingColumnsChange}
              isLegendOutside={location === 'outside'}
            />
          )}

          <EuiFormRow
            display="columnCompressed"
            label={i18n.translate('xpack.lens.shared.labelTruncation', {
              defaultMessage: 'Label truncation',
            })}
            fullWidth
          >
            <EuiFlexGroup gutterSize="s" alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiSwitch
                  compressed
                  label={i18n.translate('xpack.lens.shared.labelTruncation', {
                    defaultMessage: 'Label truncation',
                  })}
                  data-test-subj="lens-legend-truncate-switch"
                  showLabel={false}
                  checked={shouldTruncate ?? true}
                  onChange={onTruncateLegendChange}
                />
              </EuiFlexItem>
              <EuiFlexItem grow>
                <MaxLinesInput
                  disabled={!shouldTruncate}
                  value={maxLines ?? DEFAULT_TRUNCATE_LINES}
                  setValue={onMaxLinesChange}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFormRow>

          {renderNestedLegendSwitch && (
            <EuiFormRow
              display="columnCompressedSwitch"
              label={i18n.translate('xpack.lens.shared.nestedLegendLabel', {
                defaultMessage: 'Nested',
              })}
              fullWidth
            >
              <EuiSwitch
                compressed
                label={i18n.translate('xpack.lens.pieChart.nestedLegendLabel', {
                  defaultMessage: 'Nested',
                })}
                data-test-subj="lens-legend-nested-switch"
                showLabel={false}
                checked={Boolean(nestedLegend)}
                onChange={onNestedLegendChange}
              />
            </EuiFormRow>
          )}
          {allowLegendStats && (
            <EuiFormRow
              display="columnCompressedSwitch"
              label={i18n.translate('xpack.lens.shared.valueInLegendLabel', {
                defaultMessage: 'Show value',
              })}
              fullWidth
            >
              <EuiSwitch
                compressed
                label={i18n.translate('xpack.lens.shared.valueInLegendLabel', {
                  defaultMessage: 'Show value',
                })}
                data-test-subj="lens-legend-show-value"
                showLabel={false}
                checked={!!legendStats?.length}
                onChange={(ev) => {
                  onLegendStatsChange(ev.target.checked);
                }}
              />
            </EuiFormRow>
          )}
        </>
      )}
    </ToolbarPopover>
  );
}
