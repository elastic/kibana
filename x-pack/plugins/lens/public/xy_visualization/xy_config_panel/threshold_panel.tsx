/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './xy_config_panel.scss';
import React, { useCallback, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButtonGroup, EuiComboBox, EuiFormRow, EuiIcon, EuiRange } from '@elastic/eui';
import type { PaletteRegistry } from 'src/plugins/charts/public';
import type { VisualizationDimensionEditorProps } from '../../types';
import { State, XYState } from '../types';
import { FormatFactory } from '../../../common';
import { YConfig } from '../../../common/expressions';
import { LineStyle, FillStyle, IconPosition } from '../../../common/expressions/xy_chart';

import { ColorPicker } from './color_picker';
import { updateLayer, idPrefix } from '.';
import { TooltipWrapper, useDebouncedValue } from '../../shared_components';

const icons = [
  {
    value: 'none',
    label: i18n.translate('xpack.lens.xyChart.thresholds.noIconLabel', { defaultMessage: 'None' }),
  },
  {
    value: 'asterisk',
    label: i18n.translate('xpack.lens.xyChart.thresholds.asteriskIconLabel', {
      defaultMessage: 'Asterisk',
    }),
  },
  {
    value: 'bell',
    label: i18n.translate('xpack.lens.xyChart.thresholds.bellIconLabel', {
      defaultMessage: 'Bell',
    }),
  },
  {
    value: 'bolt',
    label: i18n.translate('xpack.lens.xyChart.thresholds.boltIconLabel', {
      defaultMessage: 'Bolt',
    }),
  },
  {
    value: 'bug',
    label: i18n.translate('xpack.lens.xyChart.thresholds.bugIconLabel', {
      defaultMessage: 'Bug',
    }),
  },
  {
    value: 'editorComment',
    label: i18n.translate('xpack.lens.xyChart.thresholds.commentIconLabel', {
      defaultMessage: 'Comment',
    }),
  },
  {
    value: 'alert',
    label: i18n.translate('xpack.lens.xyChart.thresholds.alertIconLabel', {
      defaultMessage: 'Alert',
    }),
  },
  {
    value: 'flag',
    label: i18n.translate('xpack.lens.xyChart.thresholds.flagIconLabel', {
      defaultMessage: 'Flag',
    }),
  },
  {
    value: 'tag',
    label: i18n.translate('xpack.lens.xyChart.thresholds.tagIconLabel', {
      defaultMessage: 'Tag',
    }),
  },
];

const IconView = (props: { value?: string; label: string }) => {
  if (!props.value) return null;
  return (
    <span>
      <EuiIcon type={props.value} />
      {` ${props.label}`}
    </span>
  );
};

const IconSelect = ({
  value,
  onChange,
}: {
  value?: string;
  onChange: (newIcon: string) => void;
}) => {
  const selectedIcon = icons.find((option) => value === option.value) || icons[0];

  return (
    <EuiComboBox
      isClearable={false}
      options={icons}
      selectedOptions={[selectedIcon]}
      onChange={(selection) => {
        onChange(selection[0].value!);
      }}
      singleSelection={{ asPlainText: true }}
      renderOption={IconView}
      compressed
    />
  );
};

function getIconPositionOptions({
  isHorizontal,
  axisMode,
}: {
  isHorizontal: boolean;
  axisMode: YConfig['axisMode'];
}) {
  const options = [
    {
      id: `${idPrefix}auto`,
      label: i18n.translate('xpack.lens.xyChart.thresholdMarker.auto', {
        defaultMessage: 'Auto',
      }),
      'data-test-subj': 'lnsXY_markerPosition_auto',
    },
  ];
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
    const bottomOptions = [
      {
        id: `${idPrefix}above`,
        label: isHorizontal ? rightLabel : topLabel,
        'data-test-subj': 'lnsXY_markerPosition_above',
      },
      {
        id: `${idPrefix}below`,
        label: isHorizontal ? leftLabel : bottomLabel,
        'data-test-subj': 'lnsXY_markerPosition_below',
      },
    ];
    if (isHorizontal) {
      // above -> below
      // left -> right
      bottomOptions.reverse();
    }
    return [...options, ...bottomOptions];
  }
  const yOptions = [
    {
      id: `${idPrefix}left`,
      label: isHorizontal ? bottomLabel : leftLabel,
      'data-test-subj': 'lnsXY_markerPosition_left',
    },
    {
      id: `${idPrefix}right`,
      label: isHorizontal ? topLabel : rightLabel,
      'data-test-subj': 'lnsXY_markerPosition_right',
    },
  ];
  if (isHorizontal) {
    // left -> right
    // above -> below
    yOptions.reverse();
  }
  return [...options, ...yOptions];
}

export const ThresholdPanel = (
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
      <ColorPicker
        {...props}
        disableHelpTooltip
        label={i18n.translate('xpack.lens.xyChart.thresholdColor.label', {
          defaultMessage: 'Color',
        })}
      />
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
        label={i18n.translate('xpack.lens.xyChart.fillThreshold.label', {
          defaultMessage: 'Fill',
        })}
      >
        <EuiButtonGroup
          isFullWidth
          legend={i18n.translate('xpack.lens.xyChart.fillThreshold.label', {
            defaultMessage: 'Fill',
          })}
          data-test-subj="lnsXY_fill_threshold"
          name="fill"
          buttonSize="compressed"
          options={[
            {
              id: `${idPrefix}none`,
              label: i18n.translate('xpack.lens.xyChart.fillThreshold.none', {
                defaultMessage: 'None',
              }),
              'data-test-subj': 'lnsXY_fill_none',
            },
            {
              id: `${idPrefix}above`,
              label: i18n.translate('xpack.lens.xyChart.fillThreshold.above', {
                defaultMessage: 'Above',
              }),
              'data-test-subj': 'lnsXY_fill_above',
            },
            {
              id: `${idPrefix}below`,
              label: i18n.translate('xpack.lens.xyChart.fillThreshold.below', {
                defaultMessage: 'Below',
              }),
              'data-test-subj': 'lnsXY_fill_below',
            },
          ]}
          idSelected={`${idPrefix}${currentYConfig?.fill || 'none'}`}
          onChange={(id) => {
            const newMode = id.replace(idPrefix, '') as FillStyle;
            setYConfig({ forAccessor: accessor, fill: newMode });
          }}
        />
      </EuiFormRow>
      <EuiFormRow
        display="columnCompressed"
        fullWidth
        label={i18n.translate('xpack.lens.xyChart.thresholdMarker.icon', {
          defaultMessage: 'Icon',
        })}
      >
        <IconSelect
          value={currentYConfig?.icon}
          onChange={(newIcon) => {
            setYConfig({ forAccessor: accessor, icon: newIcon });
          }}
        />
      </EuiFormRow>
      <EuiFormRow
        display="columnCompressed"
        fullWidth
        isDisabled={currentYConfig?.icon == null || currentYConfig?.icon === 'none'}
        label={i18n.translate('xpack.lens.xyChart.thresholdMarker.position', {
          defaultMessage: 'Icon position',
        })}
      >
        <TooltipWrapper
          tooltipContent={i18n.translate('xpack.lens.thresholdMarker.positionRequirementTooltip', {
            defaultMessage: 'You must select an icon in order to alter its position',
          })}
          condition={currentYConfig?.icon == null || currentYConfig?.icon === 'none'}
          position="top"
          delay="regular"
          display="block"
        >
          <EuiButtonGroup
            isFullWidth
            legend={i18n.translate('xpack.lens.xyChart.thresholdMarker.position', {
              defaultMessage: 'Icon position',
            })}
            data-test-subj="lnsXY_markerPosition_threshold"
            name="markerPosition"
            isDisabled={currentYConfig?.icon == null || currentYConfig?.icon === 'none'}
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
      data-test-subj="lnsXY_lineThickness"
      value={unsafeValue}
      showInput
      min={minRange}
      max={maxRange}
      step={1}
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
