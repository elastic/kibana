/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFormRow, EuiButtonGroup, EuiSwitch, EuiSwitchEvent } from '@elastic/eui';
import { Position } from '@elastic/charts';
import { ToolbarPopover } from '../shared_components';

export interface LegendSettingsPopoverProps {
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
    label: i18n.translate('xpack.lens.shared.legendPositionBottom', {
      defaultMessage: 'Bottom',
    }),
    iconType: 'arrowDown',
  },
  {
    id: Position.Left,
    label: i18n.translate('xpack.lens.shared.legendPositionLeft', {
      defaultMessage: 'Left',
    }),
    iconType: 'arrowLeft',
  },
  {
    id: Position.Right,
    label: i18n.translate('xpack.lens.shared.legendPositionRight', {
      defaultMessage: 'Right',
    }),
    iconType: 'arrowRight',
  },
  {
    id: Position.Top,
    label: i18n.translate('xpack.lens.shared.legendPositionTop', {
      defaultMessage: 'Top',
    }),
    iconType: 'arrowUp',
  },
];

export const LegendSettingsPopover: React.FunctionComponent<LegendSettingsPopoverProps> = ({
  legendOptions,
  mode,
  onDisplayChange,
  position,
  onPositionChange,
  renderNestedLegendSwitch,
  nestedLegend,
  onNestedLegendChange = () => {},
}) => {
  return (
    <ToolbarPopover
      title={i18n.translate('xpack.lens.shared.legendLabel', {
        defaultMessage: 'Legend',
      })}
      type="legend"
      groupPosition="right"
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
      <EuiFormRow
        display="columnCompressed"
        label={i18n.translate('xpack.lens.shared.legendPositionLabel', {
          defaultMessage: 'Position',
        })}
      >
        <EuiButtonGroup
          legend={i18n.translate('xpack.lens.shared.legendPositionLabel', {
            defaultMessage: 'Position',
          })}
          isDisabled={mode === 'hide'}
          data-test-subj="lens-legend-position-btn"
          name="legendPosition"
          buttonSize="compressed"
          options={toggleButtonsIcons}
          idSelected={position || Position.Right}
          onChange={onPositionChange}
          isIconOnly
        />
      </EuiFormRow>
      {renderNestedLegendSwitch && (
        <EuiFormRow
          display="columnCompressedSwitch"
          label={i18n.translate('xpack.lens.shared.nestedLegendLabel', {
            defaultMessage: 'Nested',
          })}
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
        </EuiFormRow>
      )}
    </ToolbarPopover>
  );
};
