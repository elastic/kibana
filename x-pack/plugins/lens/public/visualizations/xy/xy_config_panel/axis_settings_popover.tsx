/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import {
  EuiSwitch,
  IconType,
  EuiFormRow,
  EuiButtonGroup,
  htmlIdGenerator,
  EuiSelect,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { isEqual } from 'lodash';
import { AxisExtentConfig, YScaleType } from '@kbn/expression-xy-plugin/common';
import { ToolbarButtonProps } from '@kbn/kibana-react-plugin/public';
import {
  EuiIconAxisBottom,
  EuiIconAxisLeft,
  EuiIconAxisRight,
  EuiIconAxisTop,
} from '@kbn/chart-icons';
import { isHorizontalChart } from '../state_helpers';
import {
  ToolbarPopover,
  useDebouncedValue,
  AxisTitleSettings,
  RangeInputField,
  BucketAxisBoundsControl,
} from '../../../shared_components';
import { XYLayerConfig, AxesSettingsConfig } from '../types';
import { validateExtent } from '../axes_configuration';

import './axis_settings_popover.scss';

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
  setExtent?: (extent: AxisExtentConfig | undefined) => void;
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

const idPrefix = htmlIdGenerator()();
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
  extent,
  setExtent,
  hasBarOrAreaOnAxis,
  hasPercentageAxis,
  dataBounds,
  useMultilayerTimeAxis,
  scale,
  setScale,
}) => {
  const isHorizontal = layers?.length ? isHorizontalChart(layers) : false;
  const config = popoverConfig(axis, isHorizontal);

  const onExtentChange = useCallback(
    (newExtent) => {
      if (setExtent && newExtent && !isEqual(newExtent, extent)) {
        const { inclusiveZeroError, boundaryError } = validateExtent(hasBarOrAreaOnAxis, newExtent);
        if (
          axis === 'x' ||
          newExtent.mode !== 'custom' ||
          (!boundaryError && !inclusiveZeroError)
        ) {
          setExtent(newExtent);
        }
      }
    },
    [extent, axis, hasBarOrAreaOnAxis, setExtent]
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

      <EuiFormRow
        display="columnCompressedSwitch"
        label={i18n.translate('xpack.lens.xyChart.tickLabels', {
          defaultMessage: 'Tick labels',
        })}
        fullWidth
      >
        <EuiSwitch
          compressed
          data-test-subj={`lnsshow${axis}AxisTickLabels`}
          label={i18n.translate('xpack.lens.xyChart.tickLabels', {
            defaultMessage: 'Tick labels',
          })}
          onChange={() => toggleTickLabelsVisibility(axis)}
          checked={areTickLabelsVisible}
          showLabel={false}
        />
      </EuiFormRow>
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
            name="axisOrientation"
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
            data-test-subj={`lnsshowEndzones`}
            label={i18n.translate('xpack.lens.xyChart.showEnzones', {
              defaultMessage: 'Show partial data markers',
            })}
            onChange={() => setEndzoneVisibility(!Boolean(endzonesVisible))}
            checked={Boolean(endzonesVisible)}
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
            data-test-subj={`lnsshowEndzones`}
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
            onChange={(e) => setScale(e.target.value as YScaleType)}
            value={scale}
          />
        </EuiFormRow>
      )}
      {localExtent &&
        setLocalExtent &&
        (axis !== 'x' ? (
          <MetricAxisBoundsControl
            extent={localExtent}
            setExtent={setLocalExtent}
            dataBounds={dataBounds}
            hasBarOrAreaOnAxis={hasBarOrAreaOnAxis}
            hasPercentageAxis={hasPercentageAxis}
            testSubjPrefix="lnsXY"
          />
        ) : (
          <BucketAxisBoundsControl
            extent={localExtent}
            setExtent={setLocalExtent}
            dataBounds={dataBounds}
            testSubjPrefix="lnsXY"
          />
        ))}
    </ToolbarPopover>
  );
};

function MetricAxisBoundsControl({
  extent,
  setExtent,
  dataBounds,
  hasBarOrAreaOnAxis,
  hasPercentageAxis,
  testSubjPrefix,
}: Required<Pick<AxisSettingsPopoverProps, 'extent' | 'setExtent'>> & {
  dataBounds: AxisSettingsPopoverProps['dataBounds'];
  hasBarOrAreaOnAxis: boolean;
  hasPercentageAxis: boolean;
  testSubjPrefix: string;
}) {
  const { inclusiveZeroError, boundaryError } = validateExtent(hasBarOrAreaOnAxis, extent);
  return (
    <>
      <EuiFormRow
        display="columnCompressed"
        fullWidth
        label={i18n.translate('xpack.lens.xyChart.axisExtent.label', {
          defaultMessage: 'Bounds',
        })}
        helpText={
          hasBarOrAreaOnAxis
            ? i18n.translate('xpack.lens.xyChart.axisExtent.disabledDataBoundsMessage', {
                defaultMessage: 'Only line charts can be fit to the data bounds',
              })
            : undefined
        }
      >
        <EuiButtonGroup
          isFullWidth
          legend={i18n.translate('xpack.lens.xyChart.axisExtent.label', {
            defaultMessage: 'Bounds',
          })}
          data-test-subj={`${testSubjPrefix}_axisBounds_groups`}
          name="axisBounds"
          buttonSize="compressed"
          options={[
            {
              id: `${idPrefix}full`,
              label: i18n.translate('xpack.lens.xyChart.axisExtent.full', {
                defaultMessage: 'Full',
              }),
              'data-test-subj': `${testSubjPrefix}_axisExtent_groups_full'`,
            },
            {
              id: `${idPrefix}dataBounds`,
              label: i18n.translate('xpack.lens.xyChart.axisExtent.dataBounds', {
                defaultMessage: 'Data',
              }),
              'data-test-subj': `${testSubjPrefix}_axisExtent_groups_DataBounds'`,
              isDisabled: hasBarOrAreaOnAxis,
            },
            {
              id: `${idPrefix}custom`,
              label: i18n.translate('xpack.lens.xyChart.axisExtent.custom', {
                defaultMessage: 'Custom',
              }),
              'data-test-subj': `${testSubjPrefix}_axisExtent_groups_custom'`,
              isDisabled: hasPercentageAxis,
            },
          ]}
          idSelected={`${idPrefix}${
            (hasBarOrAreaOnAxis && extent.mode === 'dataBounds') || hasPercentageAxis
              ? 'full'
              : extent.mode
          }`}
          onChange={(id) => {
            const newMode = id.replace(idPrefix, '') as AxisExtentConfig['mode'];
            setExtent({
              ...extent,
              mode: newMode,
              lowerBound:
                newMode === 'custom' && dataBounds ? Math.min(0, dataBounds.min) : undefined,
              upperBound: newMode === 'custom' && dataBounds ? dataBounds.max : undefined,
            });
          }}
        />
      </EuiFormRow>
      {extent?.mode === 'custom' && !hasPercentageAxis && (
        <RangeInputField
          isInvalid={inclusiveZeroError || boundaryError}
          label={' '}
          helpText={
            hasBarOrAreaOnAxis && (!inclusiveZeroError || boundaryError)
              ? i18n.translate('xpack.lens.xyChart.inclusiveZero', {
                  defaultMessage: 'Bounds must include zero.',
                })
              : undefined
          }
          error={
            boundaryError
              ? i18n.translate('xpack.lens.xyChart.boundaryError', {
                  defaultMessage: 'Lower bound has to be larger than upper bound',
                })
              : hasBarOrAreaOnAxis && inclusiveZeroError
              ? i18n.translate('xpack.lens.xyChart.inclusiveZero', {
                  defaultMessage: 'Bounds must include zero.',
                })
              : undefined
          }
          testSubjLayout={`${testSubjPrefix}_axisExtent_customBounds`}
          testSubjLower={`${testSubjPrefix}_axisExtent_lowerBound`}
          testSubjUpper={`${testSubjPrefix}_axisExtent_upperBound`}
          lowerValue={extent.lowerBound ?? ''}
          onLowerValueChange={(e) => {
            const val = Number(e.target.value);
            const isEmptyValue = e.target.value === '' || Number.isNaN(Number(val));
            setExtent({
              ...extent,
              lowerBound: isEmptyValue ? undefined : val,
            });
          }}
          onLowerValueBlur={() => {
            if (extent.lowerBound === undefined && dataBounds) {
              setExtent({
                ...extent,
                lowerBound: Math.min(0, dataBounds.min),
              });
            }
          }}
          upperValue={extent.upperBound ?? ''}
          onUpperValueChange={(e) => {
            const val = Number(e.target.value);
            const isEmptyValue = e.target.value === '' || Number.isNaN(Number(val));
            setExtent({
              ...extent,
              upperBound: isEmptyValue ? undefined : val,
            });
          }}
          onUpperValueBlur={() => {
            if (extent.upperBound === undefined && dataBounds) {
              setExtent({
                ...extent,
                upperBound: dataBounds.max,
              });
            }
          }}
        />
      )}
    </>
  );
}
