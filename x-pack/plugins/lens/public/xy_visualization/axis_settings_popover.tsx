/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
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
  EuiFieldNumber,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { XYLayerConfig, AxesSettingsConfig, AxisExtent } from './types';
import { ToolbarPopover } from '../shared_components';
import { isHorizontalChart } from './state_helpers';
import { EuiIconAxisBottom } from '../assets/axis_bottom';
import { EuiIconAxisLeft } from '../assets/axis_left';
import { EuiIconAxisRight } from '../assets/axis_right';
import { EuiIconAxisTop } from '../assets/axis_top';
import { ToolbarButtonProps } from '../../../../../src/plugins/kibana_react/public';

type AxesSettingsConfigKeys = keyof AxesSettingsConfig;
export interface AxisSettingsPopoverProps {
  /**
   * Determines the axis
   */
  axis: AxesSettingsConfigKeys;
  /**
   * Contains the chart layers
   */
  layers?: XYLayerConfig[];
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
  /**
   * Set endzone visibility
   */
  setEndzoneVisibility?: (checked: boolean) => void;
  /**
   * Flag whether endzones are visible
   */
  endzonesVisible?: boolean;
  /**
   * upper bound (only used for y axes)
   */
  upperBound?: AxisExtent;
  /**
   * lower bound (only used for y axes)
   */
  lowerBound?: AxisExtent;
  /**
   * Set axis extents
   */
  setAxisExtents: (upperBound: AxisExtent, lowerBound: AxisExtent) => void;
  hasBarSeries: boolean;
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
  setEndzoneVisibility,
  endzonesVisible,
  setAxisExtents,
  lowerBound,
  upperBound,
  hasBarSeries,
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
      {setEndzoneVisibility && (
        <>
          <EuiSpacer size="m" />
          <EuiSwitch
            compressed
            data-test-subj={`lnsshowEndzones`}
            label={i18n.translate('xpack.lens.xyChart.showEnzones', {
              defaultMessage: 'Show partial data markers',
            })}
            onChange={() => setEndzoneVisibility(!Boolean(endzonesVisible))}
            checked={Boolean(endzonesVisible)}
          />
        </>
      )}
      {axis !== 'x' && lowerBound && upperBound && (
        <>
          <EuiSpacer size="m" />
          <EuiText size="xs">
            <h4>
              {i18n.translate('xpack.lens.xyChart.upperBound', {
                defaultMessage: 'Upper bound',
              })}
            </h4>
          </EuiText>
          <EuiSwitch
            compressed
            data-test-subj={`lns${axis}UpperBoundScaleToData`}
            label={i18n.translate('xpack.lens.xyChart.scaleToData', {
              defaultMessage: 'Scale to data',
            })}
            onChange={(event) =>
              setAxisExtents({ ...upperBound, scaleToData: event.target.checked }, lowerBound)
            }
            checked={upperBound.scaleToData}
          />
          <EuiFieldNumber
            data-test-subj={`lns${axis}UpperBoundExtent`}
            compressed
            placeholder={i18n.translate('xpack.lens.xyChart.bound', {
              defaultMessage: 'Bound',
            })}
            value={upperBound.value || ''}
            disabled={upperBound.scaleToData}
            onChange={({ target }) => {
              setAxisExtents({ ...upperBound, value: target.valueAsNumber }, lowerBound);
            }}
            aria-label={i18n.translate('xpack.lens.xyChart.bound', {
              defaultMessage: 'Bound',
            })}
          />
          <EuiSpacer size="m" />
          <EuiText size="xs">
            <h4>
              {i18n.translate('xpack.lens.xyChart.lowerBound', {
                defaultMessage: 'Lower bound',
              })}
            </h4>
          </EuiText>
          <EuiSwitch
            compressed
            data-test-subj={`lns${axis}LowerBoundScaleToData`}
            label={i18n.translate('xpack.lens.xyChart.scaleToDataLowerBound', {
              defaultMessage: 'Scale to data',
            })}
            onChange={(event) =>
              setAxisExtents(upperBound, { ...lowerBound, scaleToData: event.target.checked })
            }
            checked={lowerBound.scaleToData}
            disabled={hasBarSeries}
          />
          <EuiFieldNumber
            data-test-subj={`lns${axis}LowerBoundExtent`}
            compressed
            placeholder={i18n.translate('xpack.lens.xyChart.bound', {
              defaultMessage: 'Bound',
            })}
            value={lowerBound.value || ''}
            disabled={lowerBound.scaleToData || hasBarSeries}
            onChange={({ target }) => {
              setAxisExtents(upperBound, { ...lowerBound, value: target.valueAsNumber });
            }}
            aria-label={i18n.translate('xpack.lens.xyChart.bound', {
              defaultMessage: 'Bound',
            })}
          />
          <EuiSpacer size="m" />
          <EuiText size="xs">
            <h4>
              {i18n.translate('xpack.lens.xyChart.margin', {
                defaultMessage: 'Margin',
              })}
            </h4>
          </EuiText>
          <EuiFieldNumber
            data-test-subj={`lns${axis}Margin`}
            compressed
            placeholder={i18n.translate('xpack.lens.xyChart.margin', {
              defaultMessage: 'Margin',
            })}
            append="%"
            value={lowerBound.margin || ''}
            disabled={!lowerBound.scaleToData || !upperBound.scaleToData}
            onChange={({ target }) => {
              setAxisExtents(upperBound, { ...lowerBound, margin: target.valueAsNumber });
            }}
            aria-label={i18n.translate('xpack.lens.xyChart.margin', {
              defaultMessage: 'Margin',
            })}
          />
        </>
      )}
    </ToolbarPopover>
  );
};
