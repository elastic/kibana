/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiSwitch,
  EuiSpacer,
  EuiFieldText,
  IconType,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { LayerConfig, AxesSettingsConfig } from './types';
import { ToolbarPopover, ToolbarButtonProps } from '../shared_components';
import { isHorizontalChart } from './state_helpers';
import { EuiIconAxisBottom } from '../assets/axis_bottom';
import { EuiIconAxisLeft } from '../assets/axis_left';
import { EuiIconAxisRight } from '../assets/axis_right';
import { EuiIconAxisTop } from '../assets/axis_top';

type AxesSettingsConfigKeys = keyof AxesSettingsConfig;
export interface AxisSettingsPopoverProps {
  /**
   * Determines the axis
   */
  axis: AxesSettingsConfigKeys;
  /**
   * Contains the chart layers
   */
  layers?: LayerConfig[];
  /**
   * Determines the axis title
   */
  axisTitle: string | undefined;
  /**
   * Callback to axis title change
   */
  updateTitleState: (value: string) => void;
  /**
   * Determines if the popover is Disabled
   */
  isDisabled?: boolean;
  /**
   * Determines if the ticklabels of the axis are visible
   */
  areTickLabelsVisible: boolean;
  /**
   * Toggles the axis tickLabels visibility
   */
  toggleTickLabelsVisibility: (axis: AxesSettingsConfigKeys) => void;
  /**
   * Determines if the gridlines of the axis are visible
   */
  areGridlinesVisible: boolean;
  /**
   * Toggles the gridlines visibility
   */
  toggleGridlinesVisibility: (axis: AxesSettingsConfigKeys) => void;
  /**
   * Determines if the title visibility switch is on and the input text is disabled
   */
  isAxisTitleVisible: boolean;
  /**
   * Toggles the axis title visibility
   */
  toggleAxisTitleVisibility: (axis: AxesSettingsConfigKeys, checked: boolean) => void;
}
const popoverConfig = (
  axis: AxesSettingsConfigKeys,
  isHorizontal: boolean
): {
  icon: IconType;
  groupPosition: ToolbarButtonProps['groupPosition'];
  popoverTitle: string;
  buttonDataTestSubj: string;
} => {
  switch (axis) {
    case 'yLeft':
      return {
        icon: (isHorizontal ? EuiIconAxisBottom : EuiIconAxisLeft) as IconType,
        groupPosition: 'left',
        popoverTitle: isHorizontal
          ? i18n.translate('xpack.lens.xyChart.bottomAxisLabel', {
              defaultMessage: 'Bottom axis',
            })
          : i18n.translate('xpack.lens.xyChart.leftAxisLabel', {
              defaultMessage: 'Left axis',
            }),
        buttonDataTestSubj: 'lnsLeftAxisButton',
      };
    case 'yRight':
      return {
        icon: (isHorizontal ? EuiIconAxisTop : EuiIconAxisRight) as IconType,
        groupPosition: 'right',
        popoverTitle: isHorizontal
          ? i18n.translate('xpack.lens.xyChart.topAxisLabel', {
              defaultMessage: 'Top axis',
            })
          : i18n.translate('xpack.lens.xyChart.rightAxisLabel', {
              defaultMessage: 'Right axis',
            }),
        buttonDataTestSubj: 'lnsRightAxisButton',
      };
    case 'x':
    default:
      return {
        icon: (isHorizontal ? EuiIconAxisLeft : EuiIconAxisBottom) as IconType,
        groupPosition: 'center',
        popoverTitle: isHorizontal
          ? i18n.translate('xpack.lens.xyChart.leftAxisLabel', {
              defaultMessage: 'Left axis',
            })
          : i18n.translate('xpack.lens.xyChart.bottomAxisLabel', {
              defaultMessage: 'Bottom axis',
            }),

        buttonDataTestSubj: 'lnsBottomAxisButton',
      };
  }
};

export const AxisSettingsPopover: React.FunctionComponent<AxisSettingsPopoverProps> = ({
  layers,
  axis,
  axisTitle,
  updateTitleState,
  toggleTickLabelsVisibility,
  toggleGridlinesVisibility,
  isDisabled,
  areTickLabelsVisible,
  areGridlinesVisible,
  isAxisTitleVisible,
  toggleAxisTitleVisibility,
}) => {
  const [title, setTitle] = useState<string | undefined>(axisTitle);

  const isHorizontal = layers?.length ? isHorizontalChart(layers) : false;
  const config = popoverConfig(axis, isHorizontal);

  const onTitleChange = (value: string): void => {
    setTitle(value);
    updateTitleState(value);
  };
  return (
    <ToolbarPopover
      title={config.popoverTitle}
      type={config.icon}
      groupPosition={config.groupPosition}
      isDisabled={isDisabled}
      buttonDataTestSubj={config.buttonDataTestSubj}
    >
      <EuiFlexGroup gutterSize="s" justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiText size="xs">
            <h4>
              {i18n.translate('xpack.lens.xyChart.axisNameLabel', {
                defaultMessage: 'Axis name',
              })}
            </h4>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiSwitch
            compressed
            data-test-subj={`lnsShowAxisTitleSwitch__${axis}`}
            label={i18n.translate('xpack.lens.xyChart.ShowAxisTitleLabel', {
              defaultMessage: 'Show',
            })}
            onChange={({ target }) => toggleAxisTitleVisibility(axis, target.checked)}
            checked={isAxisTitleVisible}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="xs" />
      <EuiFieldText
        data-test-subj={`lns${axis}AxisTitle`}
        compressed
        placeholder={i18n.translate('xpack.lens.xyChart.overwriteAxisTitle', {
          defaultMessage: 'Overwrite axis title',
        })}
        value={title || ''}
        disabled={!isAxisTitleVisible || false}
        onChange={({ target }) => onTitleChange(target.value)}
        aria-label={i18n.translate('xpack.lens.xyChart.overwriteAxisTitle', {
          defaultMessage: 'Overwrite axis title',
        })}
      />
      <EuiSpacer size="m" />
      <EuiSwitch
        compressed
        data-test-subj={`lnsshow${axis}AxisTickLabels`}
        label={i18n.translate('xpack.lens.xyChart.tickLabels', {
          defaultMessage: 'Tick labels',
        })}
        onChange={() => toggleTickLabelsVisibility(axis)}
        checked={areTickLabelsVisible}
      />
      <EuiSpacer size="m" />
      <EuiSwitch
        compressed
        data-test-subj={`lnsshow${axis}AxisGridlines`}
        label={i18n.translate('xpack.lens.xyChart.Gridlines', {
          defaultMessage: 'Gridlines',
        })}
        onChange={() => toggleGridlinesVisibility(axis)}
        checked={areGridlinesVisible}
      />
    </ToolbarPopover>
  );
};
