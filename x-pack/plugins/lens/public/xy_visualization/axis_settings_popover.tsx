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
import { ToolbarPopover } from '../toolbar_popover';
// @ts-ignore
import { EuiIconAxisBottom } from '../assets/axis_bottom';
// @ts-ignore
import { EuiIconAxisLeft } from '../assets/axis_left';
// @ts-ignore
import { EuiIconAxisRight } from '../assets/axis_right';

type AxesSettingsConfigKeys = keyof AxesSettingsConfig;
export interface AxisSettingsPopoverProps {
  /**
   * Determines the popover title
   */
  popoverTitle: string;
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
  axis: AxesSettingsConfigKeys
): { icon: IconType; groupPosition: 'left' | 'right' | 'center' } => {
  switch (axis) {
    case 'yLeft':
      return {
        icon: EuiIconAxisLeft,
        groupPosition: 'left',
      };
    case 'yRight':
      return {
        icon: EuiIconAxisRight,
        groupPosition: 'right',
      };
    case 'x':
    default:
      return {
        icon: EuiIconAxisBottom,
        groupPosition: 'center',
      };
  }
};
export const AxisSettingsPopover: React.FunctionComponent<AxisSettingsPopoverProps> = ({
  layers,
  popoverTitle,
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

  const getAxisTitle = useCallback(() => {
    const defaultTitle = axisTitle;

    const initialLayer = layers?.[0];
    if (!initialLayer || !initialLayer.accessors.length) {
      return defaultTitle;
    }
    const datasource = frame.datasourceLayers[initialLayer.layerId];
    if (!datasource) {
      return defaultTitle;
    }
    switch (axis) {
      case 'yLeft':
        const yLeft = initialLayer.accessors[0]
          ? datasource.getOperationForColumnId(initialLayer.accessors[0])
          : null;
        return defaultTitle || yLeft?.label;
      case 'x':
      default:
        const x = initialLayer.xAccessor
          ? datasource.getOperationForColumnId(initialLayer.xAccessor)
          : null;
        return defaultTitle || x?.label;
      case 'yRight':
        let yRightTitle: string = '';
        const rightAxisLayer = layers?.filter((layer) => layer.yConfig && layer.yConfig.length > 0);
        if (rightAxisLayer && rightAxisLayer.length > 0) {
          const yConfig = rightAxisLayer[0].yConfig;
          const dataSourceNewLayer = frame.datasourceLayers[rightAxisLayer[0].layerId];
          const y = yConfig
            ? dataSourceNewLayer.getOperationForColumnId(yConfig[yConfig.length - 1].forAccessor)
            : null;
          yRightTitle = y?.label || '';
        }
        return defaultTitle || yRightTitle;
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
      title={popoverTitle}
      handlePopoverState={setPopoversOpenState}
      type={popoverConfig(axis).icon}
      groupPosition={popoverConfig(axis).groupPosition}
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
