/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButtonGroup, EuiFormRow, EuiRange } from '@elastic/eui';
import type { PaletteRegistry } from 'src/plugins/charts/public';
import type { VisualizationDimensionEditorProps } from '../../types';
import { State, XYState } from '../types';
import { FormatFactory } from '../../../common';
import { YConfig } from '../../../common/expressions';
import { LineStyle, FillStyle, IconPosition } from '../../../common/expressions/xy_chart';

import { ColorPicker } from './color_picker';
import { updateLayer } from '.';
import { TooltipWrapper, useDebouncedValue } from '../../shared_components';
import { IconSelect } from './icon_select';
import { idPrefix } from './dimension_editor';

interface LabelConfigurationOptions {
  isHorizontal: boolean;
  axisMode: YConfig['axisMode'];
}

function getFillPositionOptions({ isHorizontal, axisMode }: LabelConfigurationOptions) {
  const aboveLabel = i18n.translate('xpack.lens.xyChart.fill.above', {
    defaultMessage: 'Above',
  });
  const belowLabel = i18n.translate('xpack.lens.xyChart.fill.below', {
    defaultMessage: 'Below',
  });
  const beforeLabel = i18n.translate('xpack.lens.xyChart.fill.before', {
    defaultMessage: 'Before',
  });
  const afterLabel = i18n.translate('xpack.lens.xyChart.fill.after', {
    defaultMessage: 'After',
  });

  const aboveOptionLabel = axisMode !== 'bottom' && !isHorizontal ? aboveLabel : afterLabel;
  const belowOptionLabel = axisMode !== 'bottom' && !isHorizontal ? belowLabel : beforeLabel;

  return [
    {
      id: `${idPrefix}none`,
      label: i18n.translate('xpack.lens.xyChart.fill.none', {
        defaultMessage: 'None',
      }),
      'data-test-subj': 'lnsXY_fill_none',
    },
    {
      id: `${idPrefix}above`,
      label: aboveOptionLabel,
      'data-test-subj': 'lnsXY_fill_above',
    },
    {
      id: `${idPrefix}below`,
      label: belowOptionLabel,
      'data-test-subj': 'lnsXY_fill_below',
    },
  ];
}

function getIconPositionOptions({ isHorizontal, axisMode }: LabelConfigurationOptions) {
  const autoOption = {
    id: `${idPrefix}auto`,
    label: i18n.translate('xpack.lens.xyChart.lineMarker.auto', {
      defaultMessage: 'Auto',
    }),
    'data-test-subj': 'lnsXY_markerPosition_auto',
  };

  const topLabel = i18n.translate('xpack.lens.xyChart.markerPosition.above', {
    defaultMessage: 'Top',
  });
  const bottomLabel = i18n.translate('xpack.lens.xyChart.markerPosition.below', {
    defaultMessage: 'Bottom',
  });
  const leftLabel = i18n.translate('xpack.lens.xyChart.markerPosition.left', {
    defaultMessage: 'Left',
  });
  const rightLabel = i18n.translate('xpack.lens.xyChart.markerPosition.right', {
    defaultMessage: 'Right',
  });
  if (axisMode === 'bottom') {
    return [
      {
        id: `${idPrefix}below`,
        label: isHorizontal ? leftLabel : bottomLabel,
        'data-test-subj': 'lnsXY_markerPosition_below',
      },
      autoOption,
      {
        id: `${idPrefix}above`,
        label: isHorizontal ? rightLabel : topLabel,
        'data-test-subj': 'lnsXY_markerPosition_above',
      },
    ];
  }
  return [
    {
      id: `${idPrefix}left`,
      label: isHorizontal ? bottomLabel : leftLabel,
      'data-test-subj': 'lnsXY_markerPosition_left',
    },
    autoOption,
    {
      id: `${idPrefix}right`,
      label: isHorizontal ? topLabel : rightLabel,
      'data-test-subj': 'lnsXY_markerPosition_right',
    },
  ];
}

export function hasIcon(icon: string | undefined): icon is string {
  return icon != null && icon !== 'empty';
}

export const ReferenceLinePanel = (
  props: VisualizationDimensionEditorProps<State> & {
    formatFactory: FormatFactory;
    paletteService: PaletteRegistry;
    isHorizontal: boolean;
  }
) => {
  const { state, setState, layerId, accessor, isHorizontal } = props;

  const { inputValue: localState, handleInputChange: setLocalState } = useDebouncedValue<XYState>({
    value: state,
    onChange: setState,
  });

  const index = localState.layers.findIndex((l) => l.layerId === layerId);
  const layer = localState.layers[index];

  const setYConfig = useCallback(
    (yConfig: Partial<YConfig> | undefined) => {
      if (yConfig == null) {
        return;
      }
      const newYConfigs = [...(layer.yConfig || [])];
      const existingIndex = newYConfigs.findIndex(
        (yAxisConfig) => yAxisConfig.forAccessor === accessor
      );
      if (existingIndex !== -1) {
        newYConfigs[existingIndex] = { ...newYConfigs[existingIndex], ...yConfig };
      } else {
        newYConfigs.push({
          forAccessor: accessor,
          ...yConfig,
        });
      }
      setLocalState(updateLayer(localState, { ...layer, yConfig: newYConfigs }, index));
    },
    [accessor, index, localState, layer, setLocalState]
  );

  const currentYConfig = layer.yConfig?.find((yConfig) => yConfig.forAccessor === accessor);

  return (
    <>
      <EuiFormRow
        label={i18n.translate('xpack.lens.lineMarker.textVisibility', {
          defaultMessage: 'Text decoration',
        })}
        display="columnCompressed"
        fullWidth
      >
        <EuiButtonGroup
          legend={i18n.translate('xpack.lens.lineMarker.textVisibility', {
            defaultMessage: 'Text decoration',
          })}
          data-test-subj="lns-lineMarker-text-visibility"
          name="textVisibilityStyle"
          buttonSize="compressed"
          options={[
            {
              id: `${idPrefix}none`,
              label: i18n.translate('xpack.lens.xyChart.lineMarker.textVisibility.none', {
                defaultMessage: 'None',
              }),
              'data-test-subj': 'lnsXY_textVisibility_none',
            },
            {
              id: `${idPrefix}name`,
              label: i18n.translate('xpack.lens.xyChart.lineMarker.textVisibility.name', {
                defaultMessage: 'Name',
              }),
              'data-test-subj': 'lnsXY_textVisibility_name',
            },
          ]}
          idSelected={`${idPrefix}${Boolean(currentYConfig?.textVisibility) ? 'name' : 'none'}`}
          onChange={(id) => {
            setYConfig({ forAccessor: accessor, textVisibility: id === `${idPrefix}name` });
          }}
          isFullWidth
        />
      </EuiFormRow>
      <EuiFormRow
        display="columnCompressed"
        fullWidth
        label={i18n.translate('xpack.lens.xyChart.lineMarker.icon', {
          defaultMessage: 'Icon decoration',
        })}
      >
        <IconSelect
          value={currentYConfig?.icon}
          onChange={(newIcon) => {
            setYConfig({ forAccessor: accessor, icon: newIcon });
          }}
        />
      </EuiFormRow>
      {hasIcon(currentYConfig?.icon) || currentYConfig?.textVisibility ? (
        <EuiFormRow
          display="columnCompressed"
          fullWidth
          isDisabled={!hasIcon(currentYConfig?.icon) && !currentYConfig?.textVisibility}
          label={i18n.translate('xpack.lens.xyChart.lineMarker.position', {
            defaultMessage: 'Decoration position',
          })}
        >
          <TooltipWrapper
            tooltipContent={i18n.translate('xpack.lens.lineMarker.positionRequirementTooltip', {
              defaultMessage:
                'You must select an icon or show the name in order to alter its position',
            })}
            condition={!hasIcon(currentYConfig?.icon) && !currentYConfig?.textVisibility}
            position="top"
            delay="regular"
            display="block"
          >
            <EuiButtonGroup
              isFullWidth
              legend={i18n.translate('xpack.lens.xyChart.lineMarker.position', {
                defaultMessage: 'Decoration position',
              })}
              data-test-subj="lnsXY_markerPosition"
              name="markerPosition"
              isDisabled={!hasIcon(currentYConfig?.icon) && !currentYConfig?.textVisibility}
              buttonSize="compressed"
              options={getIconPositionOptions({
                isHorizontal,
                axisMode: currentYConfig!.axisMode,
              })}
              idSelected={`${idPrefix}${currentYConfig?.iconPosition || 'auto'}`}
              onChange={(id) => {
                const newMode = id.replace(idPrefix, '') as IconPosition;
                setYConfig({ forAccessor: accessor, iconPosition: newMode });
              }}
            />
          </TooltipWrapper>
        </EuiFormRow>
      ) : null}

      <EuiFormRow
        display="columnCompressed"
        fullWidth
        label={i18n.translate('xpack.lens.xyChart.lineStyle.label', {
          defaultMessage: 'Line style',
        })}
      >
        <EuiButtonGroup
          isFullWidth
          legend={i18n.translate('xpack.lens.xyChart.lineStyle.label', {
            defaultMessage: 'Line style',
          })}
          data-test-subj="lnsXY_line_style"
          name="lineStyle"
          buttonSize="compressed"
          options={[
            {
              id: `${idPrefix}solid`,
              label: i18n.translate('xpack.lens.xyChart.lineStyle.solid', {
                defaultMessage: 'Solid',
              }),
              'data-test-subj': 'lnsXY_line_style_solid',
            },
            {
              id: `${idPrefix}dashed`,
              label: i18n.translate('xpack.lens.xyChart.lineStyle.dashed', {
                defaultMessage: 'Dashed',
              }),
              'data-test-subj': 'lnsXY_line_style_dashed',
            },
            {
              id: `${idPrefix}dotted`,
              label: i18n.translate('xpack.lens.xyChart.lineStyle.dotted', {
                defaultMessage: 'Dotted',
              }),
              'data-test-subj': 'lnsXY_line_style_dotted',
            },
          ]}
          idSelected={`${idPrefix}${currentYConfig?.lineStyle || 'solid'}`}
          onChange={(id) => {
            const newMode = id.replace(idPrefix, '') as LineStyle;
            setYConfig({ forAccessor: accessor, lineStyle: newMode });
          }}
        />
      </EuiFormRow>
      <EuiFormRow
        display="columnCompressed"
        fullWidth
        label={i18n.translate('xpack.lens.xyChart.lineThickness.label', {
          defaultMessage: 'Line thickness',
        })}
      >
        <LineThicknessSlider
          value={currentYConfig?.lineWidth || 1}
          onChange={(value) => {
            setYConfig({ forAccessor: accessor, lineWidth: value });
          }}
        />
      </EuiFormRow>
      <EuiFormRow
        display="columnCompressed"
        fullWidth
        label={i18n.translate('xpack.lens.xyChart.fill.label', {
          defaultMessage: 'Fill',
        })}
      >
        <EuiButtonGroup
          isFullWidth
          legend={i18n.translate('xpack.lens.xyChart.fill.label', {
            defaultMessage: 'Fill',
          })}
          data-test-subj="lnsXY_fill"
          name="fill"
          buttonSize="compressed"
          options={getFillPositionOptions({ isHorizontal, axisMode: currentYConfig?.axisMode })}
          idSelected={`${idPrefix}${currentYConfig?.fill || 'none'}`}
          onChange={(id) => {
            const newMode = id.replace(idPrefix, '') as FillStyle;
            setYConfig({ forAccessor: accessor, fill: newMode });
          }}
        />
      </EuiFormRow>
      <ColorPicker
        {...props}
        disableHelpTooltip
        label={i18n.translate('xpack.lens.xyChart.lineColor.label', {
          defaultMessage: 'Color',
        })}
      />
    </>
  );
};

const minRange = 1;
const maxRange = 10;

function getSafeValue(value: number | '', prevValue: number, min: number, max: number) {
  if (value === '') {
    return prevValue;
  }
  return Math.max(minRange, Math.min(value, maxRange));
}

const LineThicknessSlider = ({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) => {
  const [unsafeValue, setUnsafeValue] = useState<string>(String(value));

  return (
    <EuiRange
      fullWidth
      data-test-subj="lnsXYThickness"
      value={unsafeValue}
      showInput
      min={minRange}
      max={maxRange}
      step={1}
      append="px"
      compressed
      onChange={({ currentTarget: { value: newValue } }) => {
        setUnsafeValue(newValue);
        const convertedValue = newValue === '' ? '' : Number(newValue);
        const safeValue = getSafeValue(Number(newValue), Number(newValue), minRange, maxRange);
        // only update onChange is the value is valid and in range
        if (convertedValue === safeValue) {
          onChange(safeValue);
        }
      }}
      onBlur={() => {
        if (unsafeValue !== String(value)) {
          const safeValue = getSafeValue(
            unsafeValue === '' ? unsafeValue : Number(unsafeValue),
            value,
            minRange,
            maxRange
          );
          onChange(safeValue);
          setUnsafeValue(String(safeValue));
        }
      }}
    />
  );
};
