/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFormRow, EuiButtonGroup, EuiSpacer, EuiSwitch, EuiSwitchEvent } from '@elastic/eui';
import { Position } from '@elastic/charts';
import { ToolbarPopover } from '../shared_components';

interface LegendSettingsPopoverProps {
  /**
   * Determines the legend display options
   */
  legendOptions: Array<{ id: string; value: 'auto' | 'show' | 'hide' | 'default'; label: string }>;
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
}

const toggleButtonsIcons = [
  {
    id: Position.Bottom,
    label: 'Bottom',
    iconType: 'arrowDown',
  },
  {
    id: Position.Left,
    label: 'Left',
    iconType: 'arrowLeft',
  },
  {
    id: Position.Right,
    label: 'Right',
    iconType: 'arrowRight',
  },
  {
    id: Position.Top,
    label: 'Top',
    iconType: 'arrowUp',
  },
];

export const LegendSettingsPopover: React.FunctionComponent<LegendSettingsPopoverProps> = ({
  legendOptions,
  mode,
  onDisplayChange,
  position,
  onPositionChange,
  renderNestedLegendSwitch = false,
  nestedLegend = false,
  onNestedLegendChange = () => {},
}) => {
  return (
    <ToolbarPopover
      title={i18n.translate('xpack.lens.xyChart.legendLabel', {
        defaultMessage: 'Legend',
      })}
      type="legend"
      groupPosition="right"
    >
      <EuiFormRow
        display="columnCompressed"
        label={i18n.translate('xpack.lens.xyChart.legendVisibilityLabel', {
          defaultMessage: 'Display',
        })}
      >
        <>
          <EuiButtonGroup
            isFullWidth
            legend={i18n.translate('xpack.lens.xyChart.legendVisibilityLabel', {
              defaultMessage: 'Display',
            })}
            name="legendDisplay"
            buttonSize="compressed"
            options={legendOptions}
            idSelected={legendOptions.find(({ value }) => value === mode)!.id}
            onChange={onDisplayChange}
          />
          <EuiSpacer size="s" />
          {renderNestedLegendSwitch && (
            <EuiSwitch
              compressed
              label={i18n.translate('xpack.lens.pieChart.nestedLegendLabel', {
                defaultMessage: 'Nested legend',
              })}
              disabled={mode === 'hide'}
              checked={nestedLegend}
              onChange={onNestedLegendChange}
            />
          )}
        </>
      </EuiFormRow>
      <EuiFormRow
        display="columnCompressed"
        label={i18n.translate('xpack.lens.xyChart.legendPositionLabel', {
          defaultMessage: 'Position',
        })}
      >
        <EuiButtonGroup
          legend={i18n.translate('xpack.lens.xyChart.legendPositionLabel', {
            defaultMessage: 'Position',
          })}
          isDisabled={mode === 'hide'}
          name="legendPosition"
          buttonSize="compressed"
          options={toggleButtonsIcons}
          idSelected={position || Position.Right}
          onChange={onPositionChange}
          isIconOnly
        />
      </EuiFormRow>
    </ToolbarPopover>
  );
};
