/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiSwitch, IconType, EuiFormRow, EuiButtonGroup, EuiSelect } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { isEqual } from 'lodash';
import { AxisExtentConfig, YScaleType } from '@kbn/expression-xy-plugin/common';
import { ToolbarButtonProps } from '@kbn/shared-ux-button-toolbar';
import {
  EuiIconAxisBottom,
  EuiIconAxisLeft,
  EuiIconAxisRight,
  EuiIconAxisTop,
} from '@kbn/chart-icons';
import { useDebouncedValue } from '@kbn/visualization-ui-components';
import { isHorizontalChart } from '../state_helpers';
import {
  ToolbarPopover,
  AxisTitleSettings,
  AxisBoundsControl,
  AxisTicksSettings,
} from '../../../shared_components';
import { XYLayerConfig, AxesSettingsConfig } from '../types';

import './axis_settings_popover.scss';
import { validateExtent } from '../../../shared_components/axis/extent/helpers';
import { getBounds } from '../../../shared_components/axis/extent/axis_extent_settings';

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
  updateTitleState: (
    title: { title?: string; visible: boolean },
    axis: AxesSettingsConfigKeys
  ) => void;
  /**
   * Determines if the popover is Disabled
   */
  isDisabled?: boolean;
  /**
   * Determines if the ticklabels of the axis are visible
   */
  areTickLabelsVisible: boolean;
  /**
   * Determines the axis labels orientation
   */
  orientation: number;
  /**
   * Callback on orientation option change
   */
  setOrientation: (axis: AxesSettingsConfigKeys, orientation: number) => void;
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
   * Set endzone visibility
   */
  setEndzoneVisibility?: (checked: boolean) => void;
  /**
   * Flag whether endzones are visible
   */
  endzonesVisible?: boolean;
  /**
   * Set current time marker visibility
   */
  setCurrentTimeMarkerVisibility?: (checked: boolean) => void;
  /**
   * Flag whether current time marker is visible
   */
  currentTimeMarkerVisible?: boolean;
  /**
   * Set scale
   */
  setScale?: (scale: YScaleType) => void;
  /**
   * Current scale
   */
  scale?: YScaleType;
  /**
   *  axis extent
   */
  extent?: AxisExtentConfig;
  /**
   * set axis extent
   */
  setExtent?: (extent?: AxisExtentConfig) => void;
  /**
   * Set scale and extent together
   *
   * Note: Must set both together or state does not update correctly
   */
  setScaleWithExtent?: (extent?: AxisExtentConfig, scale?: YScaleType) => void;
  hasBarOrAreaOnAxis: boolean;
  hasPercentageAxis: boolean;
  dataBounds?: { min: number; max: number };

  /**
   * Toggle the visibility of legacy axis settings when using the new multilayer time axis
   */
  useMultilayerTimeAxis?: boolean;
}

const popoverConfig = (
  axis: AxesSettingsConfigKeys,
  isHorizontal: boolean
): {
  icon: IconType;
  groupPosition: ToolbarButtonProps<'iconButton'>['groupPosition'];
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
const axisOrientationOptions: Array<{
  id: string;
  value: 0 | -90 | -45;
  label: string;
}> = [
  {
    id: 'xy_axis_orientation_horizontal',
    value: 0,
    label: i18n.translate('xpack.lens.xyChart.axisOrientation.horizontal', {
      defaultMessage: 'Horizontal',
    }),
  },
  {
    id: 'xy_axis_orientation_vertical',
    value: -90,
    label: i18n.translate('xpack.lens.xyChart.axisOrientation.vertical', {
      defaultMessage: 'Vertical',
    }),
  },
  {
    id: 'xy_axis_orientation_angled',
    value: -45,
    label: i18n.translate('xpack.lens.xyChart.axisOrientation.angled', {
      defaultMessage: 'Angled',
    }),
  },
];

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
  orientation,
  setOrientation,
  setEndzoneVisibility,
  endzonesVisible,
  setCurrentTimeMarkerVisibility,
  currentTimeMarkerVisible,
  extent,
  setExtent,
  hasBarOrAreaOnAxis,
  hasPercentageAxis,
  dataBounds,
  useMultilayerTimeAxis,
  scale,
  setScale,
  setScaleWithExtent,
}) => {
  const isHorizontal = layers?.length ? isHorizontalChart(layers) : false;
  const config = popoverConfig(axis, isHorizontal);

  const onExtentChange = useCallback(
    (newExtent) => {
      if (setExtent && newExtent && !isEqual(newExtent, extent)) {
        const { errorMsg } = validateExtent(hasBarOrAreaOnAxis, newExtent, scale);
        if (axis === 'x' || newExtent.mode !== 'custom' || !errorMsg) {
          setExtent(newExtent);
        }
      }
    },
    [setExtent, extent, hasBarOrAreaOnAxis, scale, axis]
  );

  const { inputValue: localExtent, handleInputChange: setLocalExtent } = useDebouncedValue<
    AxisExtentConfig | undefined
  >({
    value: extent,
    onChange: onExtentChange,
  });

  return (
    <ToolbarPopover
      title={config.popoverTitle}
      type={config.icon}
      groupPosition={config.groupPosition}
      isDisabled={isDisabled}
      buttonDataTestSubj={config.buttonDataTestSubj}
      panelClassName="lnsVisToolbarAxis__popover"
    >
      <AxisTitleSettings
        axis={axis}
        axisTitle={axisTitle}
        updateTitleState={updateTitleState}
        isAxisTitleVisible={isAxisTitleVisible}
      />
      <EuiFormRow
        display="columnCompressedSwitch"
        label={i18n.translate('xpack.lens.xyChart.Gridlines', {
          defaultMessage: 'Gridlines',
        })}
        fullWidth
      >
        <EuiSwitch
          compressed
          data-test-subj={`lnsshow${axis}AxisGridlines`}
          label={i18n.translate('xpack.lens.xyChart.Gridlines', {
            defaultMessage: 'Gridlines',
          })}
          onChange={() => toggleGridlinesVisibility(axis)}
          checked={areGridlinesVisible}
          showLabel={false}
        />
      </EuiFormRow>

      <AxisTicksSettings
        axis={axis}
        updateTicksVisibilityState={(visible) => {
          toggleTickLabelsVisibility(axis);
        }}
        isAxisLabelVisible={areTickLabelsVisible}
      />
      {!useMultilayerTimeAxis && areTickLabelsVisible && (
        <EuiFormRow
          display="columnCompressed"
          fullWidth
          label={i18n.translate('xpack.lens.xyChart.axisOrientation.label', {
            defaultMessage: 'Orientation',
          })}
        >
          <EuiButtonGroup
            isFullWidth
            legend={i18n.translate('xpack.lens.xyChart.axisOrientation.label', {
              defaultMessage: 'Orientation',
            })}
            data-test-subj="lnsXY_axisOrientation_groups"
            buttonSize="compressed"
            options={axisOrientationOptions}
            idSelected={axisOrientationOptions.find(({ value }) => value === orientation)!.id}
            onChange={(optionId) => {
              const newOrientation = axisOrientationOptions.find(
                ({ id }) => id === optionId
              )!.value;
              setOrientation(axis, newOrientation);
            }}
          />
        </EuiFormRow>
      )}
      {setEndzoneVisibility && (
        <EuiFormRow
          display="columnCompressedSwitch"
          label={i18n.translate('xpack.lens.xyChart.showEnzones', {
            defaultMessage: 'Show partial data markers',
          })}
          fullWidth
        >
          <EuiSwitch
            compressed
            data-test-subj="lnsshowEndzones"
            label={i18n.translate('xpack.lens.xyChart.showEnzones', {
              defaultMessage: 'Show partial data markers',
            })}
            onChange={() => setEndzoneVisibility(!Boolean(endzonesVisible))}
            checked={Boolean(endzonesVisible)}
            showLabel={false}
          />
        </EuiFormRow>
      )}
      {setCurrentTimeMarkerVisibility && (
        <EuiFormRow
          display="columnCompressedSwitch"
          label={i18n.translate('xpack.lens.xyChart.showCurrenTimeMarker', {
            defaultMessage: 'Show current time marker',
          })}
          fullWidth
        >
          <EuiSwitch
            compressed
            data-test-subj="lnsshowCurrentTimeMarker"
            label={i18n.translate('xpack.lens.xyChart.showCurrenTimeMarker', {
              defaultMessage: 'Show current time marker',
            })}
            onChange={() => setCurrentTimeMarkerVisibility(!Boolean(currentTimeMarkerVisible))}
            checked={Boolean(currentTimeMarkerVisible)}
            showLabel={false}
          />
        </EuiFormRow>
      )}
      {setScale && (
        <EuiFormRow
          display="columnCompressed"
          label={i18n.translate('xpack.lens.xyChart.setScale', {
            defaultMessage: 'Axis scale',
          })}
          fullWidth
        >
          <EuiSelect
            compressed
            fullWidth
            data-test-subj="lnsScaleSelect"
            aria-label={i18n.translate('xpack.lens.xyChart.setScale', {
              defaultMessage: 'Axis scale',
            })}
            options={[
              {
                text: i18n.translate('xpack.lens.xyChart.scaleLinear', {
                  defaultMessage: 'Linear',
                }),
                value: 'linear',
              },
              {
                text: i18n.translate('xpack.lens.xyChart.scaleLog', {
                  defaultMessage: 'Logarithmic',
                }),
                value: 'log',
              },
              {
                text: i18n.translate('xpack.lens.xyChart.scaleSquare', {
                  defaultMessage: 'Square root',
                }),
                value: 'sqrt',
              },
            ]}
            onChange={({ target }) => {
              if (!setScaleWithExtent || !extent) return;
              const newScale = target.value as YScaleType;

              setScaleWithExtent(
                {
                  ...extent,
                  ...getBounds(extent.mode, newScale, dataBounds),
                },
                newScale
              );
            }}
            value={scale}
          />
        </EuiFormRow>
      )}
      {localExtent && setLocalExtent && (
        <AxisBoundsControl
          type={axis !== 'x' ? 'metric' : 'bucket'}
          extent={localExtent}
          scaleType={scale}
          setExtent={setLocalExtent}
          dataBounds={dataBounds}
          hasBarOrArea={hasBarOrAreaOnAxis}
          disableCustomRange={hasPercentageAxis}
          testSubjPrefix="lnsXY"
          // X axis is passing the extent object only in case of numeric histogram
          canHaveNiceValues={axis !== 'x' || Boolean(extent)}
        />
      )}
    </ToolbarPopover>
  );
};
