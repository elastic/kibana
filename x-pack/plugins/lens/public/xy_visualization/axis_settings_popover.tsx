/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useEffect, useCallback } from 'react';
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
import { FramePublicAPI } from '../types';
import { ToolbarPopover } from '../shared_components';
import { ToolbarButtonProps } from '../toolbar_button';
import { isHorizontalChart } from './state_helpers';
import { getAxesConfiguration } from './axes_configuration';
// @ts-ignore
import { EuiIconAxisBottom } from '../assets/axis_bottom';
// @ts-ignore
import { EuiIconAxisLeft } from '../assets/axis_left';
// @ts-ignore
import { EuiIconAxisRight } from '../assets/axis_right';

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
   * Determines the frame
   */
  frame: FramePublicAPI;
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
): { icon: IconType; groupPosition: ToolbarButtonProps['groupPosition']; popoverTitle: string } => {
  switch (axis) {
    case 'yLeft':
      return {
        icon: isHorizontal ? EuiIconAxisBottom : EuiIconAxisLeft,
        groupPosition: 'left',
        popoverTitle: isHorizontal
          ? i18n.translate('xpack.lens.xyChart.bottomAxisLabel', {
              defaultMessage: 'Bottom axis',
            })
          : i18n.translate('xpack.lens.xyChart.leftAxisLabel', {
              defaultMessage: 'Left axis',
            }),
      };
    case 'yRight':
      return {
        // should be top, missing icon
        icon: isHorizontal ? EuiIconAxisBottom : EuiIconAxisRight,
        groupPosition: 'right',
        popoverTitle: isHorizontal
          ? i18n.translate('xpack.lens.xyChart.topAxisLabel', {
              defaultMessage: 'Top axis',
            })
          : i18n.translate('xpack.lens.xyChart.rightAxisLabel', {
              defaultMessage: 'Right axis',
            }),
      };
    case 'x':
    default:
      return {
        icon: isHorizontal ? EuiIconAxisLeft : EuiIconAxisBottom,
        groupPosition: 'center',
        popoverTitle: isHorizontal
          ? i18n.translate('xpack.lens.xyChart.leftAxisLabel', {
              defaultMessage: 'Left axis',
            })
          : i18n.translate('xpack.lens.xyChart.bottomAxisLabel', {
              defaultMessage: 'Bottom axis',
            }),
      };
  }
};

const yAxisTitle = (
  groupId: 'left' | 'right',
  layers: LayerConfig[] | undefined,
  isHorizontal: boolean,
  frame: FramePublicAPI
) => {
  const axisGroups = layers ? getAxesConfiguration(layers, isHorizontal) : [];
  const activeGroup = axisGroups.find((group) => group.groupId === groupId);
  const initialSeries = activeGroup?.series[0];
  if (!initialSeries) {
    return;
  }
  const dataSourceRightLayer = frame.datasourceLayers[initialSeries.layer];
  const y = dataSourceRightLayer.getOperationForColumnId(initialSeries.accessor) || null;
  return y?.label;
};

export const AxisSettingsPopover: React.FunctionComponent<AxisSettingsPopoverProps> = ({
  layers,
  axis,
  axisTitle,
  frame,
  updateTitleState,
  toggleTickLabelsVisibility,
  toggleGridlinesVisibility,
  isDisabled,
  areTickLabelsVisible,
  areGridlinesVisible,
  isAxisTitleVisible,
  toggleAxisTitleVisibility,
}) => {
  const [popoversOpenState, setPopoversOpenState] = useState(false);
  const [title, setTitle] = useState<string | undefined>(axisTitle);

  const isHorizontal = layers?.length ? isHorizontalChart(layers) : false;
  const config = popoverConfig(axis, isHorizontal);

  const getAxisTitle = useCallback(() => {
    const defaultTitle = axisTitle;
    switch (axis) {
      case 'x':
      default:
        const initialLayer = layers?.[0];
        if (!initialLayer || !initialLayer.accessors.length) {
          return defaultTitle;
        }
        const datasource = frame.datasourceLayers[initialLayer.layerId];
        if (!datasource) {
          return defaultTitle;
        }
        const x = initialLayer.xAccessor
          ? datasource.getOperationForColumnId(initialLayer.xAccessor)
          : null;
        return defaultTitle || x?.label;
      case 'yRight':
        const yRight = yAxisTitle('right', layers, isHorizontal, frame);
        return defaultTitle || yRight;

      case 'yLeft':
        const yLeft = yAxisTitle('left', layers, isHorizontal, frame);
        return defaultTitle || yLeft;
    }
    /* We want this callback to run only if open changes its state. What we want to accomplish here is to give the user a better UX.
       By default these input fields have the axis legends. If the user changes the input text, the axis legends should also change.
       BUT if the user cleans up the input text, it should remain empty until the user closes and reopens the panel.
       In that case, the default axis legend should appear. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [popoversOpenState]);

  useEffect(() => {
    setTitle(getAxisTitle());
  }, [getAxisTitle]);

  const onTitleChange = (value: string): void => {
    setTitle(value);
    updateTitleState(value);
  };
  return (
    <ToolbarPopover
      title={config.popoverTitle}
      handlePopoverState={setPopoversOpenState}
      type={config.icon}
      groupPosition={config.groupPosition}
      isDisabled={isDisabled}
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
