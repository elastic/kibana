/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiSwitch,
  EuiSpacer,
  EuiFieldText,
  IconType,
  EuiFormRow,
  EuiButtonGroup,
  htmlIdGenerator,
  EuiFieldNumber,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { XYLayerConfig, AxesSettingsConfig, AxisExtentConfig } from './types';
import { ToolbarPopover, useDebouncedValue } from '../shared_components';
import { isHorizontalChart } from './state_helpers';
import { EuiIconAxisBottom } from '../assets/axis_bottom';
import { EuiIconAxisLeft } from '../assets/axis_left';
import { EuiIconAxisRight } from '../assets/axis_right';
import { EuiIconAxisTop } from '../assets/axis_top';
import { ToolbarButtonProps } from '../../../../../src/plugins/kibana_react/public';
import { validateExtent } from './axes_configuration';

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

const noop = () => {};
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
  toggleAxisTitleVisibility,
  setEndzoneVisibility,
  endzonesVisible,
  extent,
  setExtent,
  hasBarOrAreaOnAxis,
  hasPercentageAxis,
  dataBounds,
}) => {
  const isHorizontal = layers?.length ? isHorizontalChart(layers) : false;
  const config = popoverConfig(axis, isHorizontal);

  const { inputValue: debouncedExtent, handleInputChange: setDebouncedExtent } = useDebouncedValue<
    AxisExtentConfig | undefined
  >({
    value: extent,
    onChange: setExtent || noop,
  });

  const [localExtent, setLocalExtent] = useState(debouncedExtent);

  const { inclusiveZeroError, boundaryError } = validateExtent(hasBarOrAreaOnAxis, localExtent);

  useEffect(() => {
    // set global extent if local extent is not invalid
    if (
      setExtent &&
      !inclusiveZeroError &&
      !boundaryError &&
      localExtent &&
      localExtent !== debouncedExtent
    ) {
      setDebouncedExtent(localExtent);
    }
  }, [
    localExtent,
    inclusiveZeroError,
    boundaryError,
    setDebouncedExtent,
    debouncedExtent,
    setExtent,
  ]);

  const { inputValue: title, handleInputChange: onTitleChange } = useDebouncedValue<string>({
    value: axisTitle || '',
    onChange: updateTitleState,
  });
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
      {localExtent && setExtent && (
        <>
          <EuiSpacer size="s" />
          <EuiFormRow
            display="rowCompressed"
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
              data-test-subj="lnsXY_axisBounds_groups"
              name="axisBounds"
              buttonSize="compressed"
              options={[
                {
                  id: `${idPrefix}full`,
                  label: i18n.translate('xpack.lens.xyChart.axisExtent.full', {
                    defaultMessage: 'Full',
                  }),
                  'data-test-subj': 'lnsXY_axisExtent_groups_full',
                },
                {
                  id: `${idPrefix}dataBounds`,
                  label: i18n.translate('xpack.lens.xyChart.axisExtent.dataBounds', {
                    defaultMessage: 'Data bounds',
                  }),
                  'data-test-subj': 'lnsXY_axisExtent_groups_DataBounds',
                  isDisabled: hasBarOrAreaOnAxis,
                },
                {
                  id: `${idPrefix}custom`,
                  label: i18n.translate('xpack.lens.xyChart.axisExtent.custom', {
                    defaultMessage: 'Custom',
                  }),
                  'data-test-subj': 'lnsXY_axisExtent_groups_custom',
                  isDisabled: hasPercentageAxis,
                },
              ]}
              idSelected={`${idPrefix}${
                (hasBarOrAreaOnAxis && localExtent.mode === 'dataBounds') || hasPercentageAxis
                  ? 'full'
                  : localExtent.mode
              }`}
              onChange={(id) => {
                const newMode = id.replace(idPrefix, '') as AxisExtentConfig['mode'];
                setLocalExtent({
                  ...localExtent,
                  mode: newMode,
                  lowerBound:
                    newMode === 'custom' && dataBounds ? Math.min(0, dataBounds.min) : undefined,
                  upperBound: newMode === 'custom' && dataBounds ? dataBounds.max : undefined,
                });
              }}
            />
          </EuiFormRow>
          {localExtent.mode === 'custom' && !hasPercentageAxis && (
            <>
              <EuiSpacer size="s" />
              <EuiFlexGroup gutterSize="s">
                <EuiFlexItem>
                  <EuiFormRow
                    display="rowCompressed"
                    fullWidth
                    label={i18n.translate('xpack.lens.xyChart.lowerBoundLabel', {
                      defaultMessage: 'Lower bound',
                    })}
                    isInvalid={inclusiveZeroError || boundaryError}
                    helpText={
                      hasBarOrAreaOnAxis && !inclusiveZeroError
                        ? i18n.translate('xpack.lens.xyChart.inclusiveZero', {
                            defaultMessage: 'Bounds must include zero.',
                          })
                        : undefined
                    }
                    error={
                      hasBarOrAreaOnAxis && inclusiveZeroError
                        ? i18n.translate('xpack.lens.xyChart.inclusiveZero', {
                            defaultMessage: 'Bounds must include zero.',
                          })
                        : undefined
                    }
                  >
                    <EuiFieldNumber
                      compressed
                      value={localExtent.lowerBound ?? ''}
                      isInvalid={inclusiveZeroError || boundaryError}
                      data-test-subj="lnsXY_axisExtent_lowerBound"
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        if (e.target.value === '' || Number.isNaN(Number(val))) {
                          setLocalExtent({
                            ...localExtent,
                            lowerBound: undefined,
                          });
                        } else {
                          setLocalExtent({
                            ...localExtent,
                            lowerBound: val,
                          });
                        }
                      }}
                      onBlur={() => {
                        if (localExtent.lowerBound === undefined && dataBounds) {
                          setLocalExtent({
                            ...localExtent,
                            lowerBound: Math.min(0, dataBounds.min),
                          });
                        }
                      }}
                    />
                  </EuiFormRow>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiFormRow
                    display="rowCompressed"
                    fullWidth
                    label={i18n.translate('xpack.lens.xyChart.upperBoundLabel', {
                      defaultMessage: 'Upper bound',
                    })}
                    isInvalid={inclusiveZeroError || boundaryError}
                    error={
                      boundaryError
                        ? i18n.translate('xpack.lens.xyChart.boundaryError', {
                            defaultMessage: 'Lower bound has to be larger than upper bound',
                          })
                        : undefined
                    }
                  >
                    <EuiFieldNumber
                      compressed
                      value={localExtent.upperBound ?? ''}
                      data-test-subj="lnsXY_axisExtent_upperBound"
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        if (e.target.value === '' || Number.isNaN(Number(val))) {
                          setLocalExtent({
                            ...localExtent,
                            upperBound: undefined,
                          });
                        } else {
                          setLocalExtent({
                            ...localExtent,
                            upperBound: val,
                          });
                        }
                      }}
                      onBlur={() => {
                        if (localExtent.upperBound === undefined && dataBounds) {
                          setLocalExtent({
                            ...localExtent,
                            upperBound: dataBounds.max,
                          });
                        }
                      }}
                    />
                  </EuiFormRow>
                </EuiFlexItem>
              </EuiFlexGroup>
            </>
          )}
        </>
      )}
    </ToolbarPopover>
  );
};
