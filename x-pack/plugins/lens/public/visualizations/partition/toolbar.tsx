/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './toolbar.scss';
import React, { useCallback, useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiFlexGroup,
  EuiFormRow,
  EuiSuperSelect,
  EuiRange,
  EuiHorizontalRule,
  EuiButtonGroup,
  EuiColorPicker,
  euiPaletteColorBlind,
  EuiToolTip,
} from '@elastic/eui';
import type { Position } from '@elastic/charts';
import type { PaletteRegistry } from '@kbn/coloring';
import { LegendSize } from '@kbn/visualizations-plugin/public';
import { DEFAULT_PERCENT_DECIMALS } from './constants';
import { PartitionChartsMeta } from './partition_charts_meta';
import {
  LegendDisplay,
  PieLayerState,
  PieVisualizationState,
  SharedPieLayerState,
} from '../../../common';
import { VisualizationDimensionEditorProps, VisualizationToolbarProps } from '../../types';
import {
  ToolbarPopover,
  LegendSettingsPopover,
  useDebouncedValue,
  PalettePicker,
} from '../../shared_components';
import { getDefaultVisualValuesForLayer } from '../../shared_components/datasource_default_values';
import { shouldShowValuesInLegend } from './render_helpers';
import { CollapseSetting } from '../../shared_components/collapse_setting';
import { getDefaultColorForMultiMetricDimension, isCollapsed } from './visualization';

const legendOptions: Array<{
  value: SharedPieLayerState['legendDisplay'];
  label: string;
  id: string;
}> = [
  {
    id: 'pieLegendDisplay-default',
    value: LegendDisplay.DEFAULT,
    label: i18n.translate('xpack.lens.pieChart.legendVisibility.auto', {
      defaultMessage: 'Auto',
    }),
  },
  {
    id: 'pieLegendDisplay-show',
    value: LegendDisplay.SHOW,
    label: i18n.translate('xpack.lens.pieChart.legendVisibility.show', {
      defaultMessage: 'Show',
    }),
  },
  {
    id: 'pieLegendDisplay-hide',
    value: LegendDisplay.HIDE,
    label: i18n.translate('xpack.lens.pieChart.legendVisibility.hide', {
      defaultMessage: 'Hide',
    }),
  },
];

const emptySizeRatioLabel = i18n.translate('xpack.lens.pieChart.emptySizeRatioLabel', {
  defaultMessage: 'Inner area size',
});

export function PieToolbar(props: VisualizationToolbarProps<PieVisualizationState>) {
  const { state, setState, frame } = props;
  const layer = state.layers[0];
  const {
    categoryOptions,
    numberOptions,
    emptySizeRatioOptions,
    isDisabled: isToolbarPopoverDisabled,
  } = PartitionChartsMeta[state.shape].toolbarPopover;

  const legendSize = layer.legendSize;

  const [hadAutoLegendSize] = useState(() => legendSize === LegendSize.AUTO);

  const onStateChange = useCallback(
    (part: Record<string, unknown>) => {
      setState({
        ...state,
        layers: [{ ...layer, ...part }],
      });
    },
    [layer, state, setState]
  );

  const onCategoryDisplayChange = useCallback(
    (option) => onStateChange({ categoryDisplay: option }),
    [onStateChange]
  );

  const onNumberDisplayChange = useCallback(
    (option) => onStateChange({ numberDisplay: option }),
    [onStateChange]
  );

  const onPercentDecimalsChange = useCallback(
    (option) => {
      onStateChange({ percentDecimals: option });
    },
    [onStateChange]
  );

  const onLegendDisplayChange = useCallback(
    (optionId) => {
      onStateChange({ legendDisplay: legendOptions.find(({ id }) => id === optionId)!.value });
    },
    [onStateChange]
  );

  const onLegendPositionChange = useCallback(
    (id) => onStateChange({ legendPosition: id as Position }),
    [onStateChange]
  );

  const onNestedLegendChange = useCallback(
    (id) => onStateChange({ nestedLegend: !layer.nestedLegend }),
    [layer, onStateChange]
  );

  const onTruncateLegendChange = useCallback(() => {
    const current = layer.truncateLegend ?? true;
    onStateChange({ truncateLegend: !current });
  }, [layer, onStateChange]);

  const onLegendMaxLinesChange = useCallback(
    (val) => onStateChange({ legendMaxLines: val }),
    [onStateChange]
  );

  const onLegendSizeChange = useCallback(
    (val) => onStateChange({ legendSize: val }),
    [onStateChange]
  );

  const onValueInLegendChange = useCallback(() => {
    onStateChange({
      showValuesInLegend: !shouldShowValuesInLegend(layer, state.shape),
    });
  }, [layer, state.shape, onStateChange]);

  const onEmptySizeRatioChange = useCallback(
    (sizeId) => {
      const emptySizeRatio = emptySizeRatioOptions?.find(({ id }) => id === sizeId)?.value;
      onStateChange({ emptySizeRatio });
    },
    [emptySizeRatioOptions, onStateChange]
  );

  if (!layer) {
    return null;
  }

  const defaultTruncationValue = getDefaultVisualValuesForLayer(
    state,
    frame.datasourceLayers
  ).truncateText;

  return (
    <EuiFlexGroup alignItems="center" gutterSize="none" responsive={false}>
      <ToolbarPopover
        title={i18n.translate('xpack.lens.pieChart.valuesLabel', {
          defaultMessage: 'Labels',
        })}
        isDisabled={Boolean(isToolbarPopoverDisabled)}
        type="labels"
        groupPosition="left"
        buttonDataTestSubj="lnsLabelsButton"
      >
        {categoryOptions.length ? (
          <EuiFormRow
            label={i18n.translate('xpack.lens.pieChart.labelPositionLabel', {
              defaultMessage: 'Position',
            })}
            fullWidth
            display="columnCompressed"
          >
            <EuiSuperSelect
              compressed
              valueOfSelected={layer.categoryDisplay}
              options={categoryOptions}
              onChange={onCategoryDisplayChange}
            />
          </EuiFormRow>
        ) : null}

        {numberOptions.length && layer.categoryDisplay !== 'hide' ? (
          <EuiFormRow
            label={i18n.translate('xpack.lens.pieChart.numberLabels', {
              defaultMessage: 'Values',
            })}
            fullWidth
            display="columnCompressed"
          >
            <EuiSuperSelect
              compressed
              valueOfSelected={layer.numberDisplay}
              options={numberOptions}
              onChange={onNumberDisplayChange}
            />
          </EuiFormRow>
        ) : null}

        {numberOptions.length + categoryOptions.length ? <EuiHorizontalRule margin="s" /> : null}

        <EuiFormRow
          label={i18n.translate('xpack.lens.pieChart.percentDecimalsLabel', {
            defaultMessage: 'Maximum decimal places for percent',
          })}
          fullWidth
          display="rowCompressed"
        >
          <DecimalPlaceSlider
            value={layer.percentDecimals ?? DEFAULT_PERCENT_DECIMALS}
            setValue={onPercentDecimalsChange}
          />
        </EuiFormRow>
      </ToolbarPopover>
      {emptySizeRatioOptions?.length ? (
        <ToolbarPopover
          title={i18n.translate('xpack.lens.pieChart.visualOptionsLabel', {
            defaultMessage: 'Visual options',
          })}
          type="visualOptions"
          groupPosition="center"
          buttonDataTestSubj="lnsVisualOptionsButton"
        >
          <EuiFormRow label={emptySizeRatioLabel} display="columnCompressed" fullWidth>
            <EuiButtonGroup
              isFullWidth
              name="emptySizeRatio"
              buttonSize="compressed"
              legend={emptySizeRatioLabel}
              options={emptySizeRatioOptions}
              idSelected={
                emptySizeRatioOptions.find(({ value }) => value === layer.emptySizeRatio)?.id ??
                'emptySizeRatioOption-small'
              }
              onChange={onEmptySizeRatioChange}
              data-test-subj="lnsEmptySizeRatioButtonGroup"
            />
          </EuiFormRow>
        </ToolbarPopover>
      ) : null}
      <LegendSettingsPopover
        legendOptions={legendOptions}
        mode={layer.legendDisplay}
        onDisplayChange={onLegendDisplayChange}
        valueInLegend={shouldShowValuesInLegend(layer, state.shape)}
        renderValueInLegendSwitch={
          'showValues' in PartitionChartsMeta[state.shape]?.legend ?? false
        }
        onValueInLegendChange={onValueInLegendChange}
        position={layer.legendPosition}
        onPositionChange={onLegendPositionChange}
        renderNestedLegendSwitch={!PartitionChartsMeta[state.shape]?.legend.hideNestedLegendSwitch}
        nestedLegend={Boolean(layer.nestedLegend)}
        onNestedLegendChange={onNestedLegendChange}
        shouldTruncate={layer.truncateLegend ?? defaultTruncationValue}
        onTruncateLegendChange={onTruncateLegendChange}
        maxLines={layer?.legendMaxLines}
        onMaxLinesChange={onLegendMaxLinesChange}
        legendSize={legendSize}
        onLegendSizeChange={onLegendSizeChange}
        showAutoLegendSizeOption={hadAutoLegendSize}
      />
    </EuiFlexGroup>
  );
}

const DecimalPlaceSlider = ({
  value,
  setValue,
}: {
  value: number;
  setValue: (value: number) => void;
}) => {
  const { inputValue, handleInputChange } = useDebouncedValue(
    {
      value,
      onChange: setValue,
    },
    { allowFalsyValue: true }
  );
  return (
    <EuiRange
      data-test-subj="indexPattern-dimension-formatDecimals"
      value={inputValue}
      min={0}
      max={10}
      showInput
      compressed
      onChange={(e) => {
        handleInputChange(Number(e.currentTarget.value));
      }}
    />
  );
};

type DimensionEditorProps = VisualizationDimensionEditorProps<PieVisualizationState> & {
  paletteService: PaletteRegistry;
};

export function DimensionEditor(props: DimensionEditorProps) {
  const currentLayer = props.state.layers.find((layer) => layer.layerId === props.layerId);

  if (!currentLayer) {
    return null;
  }

  const firstNonCollapsedColumnId = currentLayer.primaryGroups.find(
    (id) => !isCollapsed(id, currentLayer)
  );

  const showColorPicker =
    currentLayer.metrics.includes(props.accessor) && currentLayer.allowMultipleMetrics;

  return (
    <>
      {props.accessor === firstNonCollapsedColumnId && (
        <PalettePicker
          palettes={props.paletteService}
          activePalette={props.state.palette}
          setPalette={(newPalette) => {
            props.setState({ ...props.state, palette: newPalette });
          }}
        />
      )}
      {showColorPicker && <StaticColorControls {...props} currentLayer={currentLayer} />}
    </>
  );
}

function StaticColorControls({
  state,
  paletteService,
  accessor,
  setState,
  datasource,
  currentLayer,
}: DimensionEditorProps & { currentLayer: PieLayerState }) {
  const colorLabel = i18n.translate('xpack.lens.pieChart.color', {
    defaultMessage: 'Color',
  });

  const disabledMessage = currentLayer.primaryGroups.length
    ? ['pie', 'donut'].includes(state.shape)
      ? i18n.translate('xpack.lens.pieChart.colorPicker.disabledBecauseSliceBy', {
          defaultMessage:
            'You are unable to apply custom colors to individual slices when the layer includes one or more "Slice by" dimensions.',
        })
      : i18n.translate('xpack.lens.pieChart.colorPicker.disabledBecauseGroupBy', {
          defaultMessage:
            'You are unable to apply custom colors to individual slices when the layer includes one or more "Group by" dimensions.',
        })
    : '';

  const defaultColor = getDefaultColorForMultiMetricDimension({
    layer: currentLayer,
    columnId: accessor,
    paletteService,
    datasource,
  });

  const setColor = useCallback(
    (color: string) => {
      const newColorsByDimension = { ...currentLayer.colorsByDimension };

      if (color) {
        newColorsByDimension[accessor] = color;
      } else {
        delete newColorsByDimension[accessor];
      }

      setState({
        ...state,
        layers: state.layers.map((layer) =>
          layer.layerId === currentLayer.layerId
            ? {
                ...layer,
                colorsByDimension: newColorsByDimension,
              }
            : layer
        ),
      });
    },
    [accessor, currentLayer.colorsByDimension, currentLayer.layerId, setState, state]
  );

  const { inputValue: currentColor, handleInputChange: handleColorChange } =
    useDebouncedValue<string>(
      {
        onChange: setColor,
        value: currentLayer.colorsByDimension?.[accessor] || defaultColor,
      },
      { allowFalsyValue: true }
    );

  const isDisabled = Boolean(disabledMessage);

  const renderColorPicker = () => (
    <EuiColorPicker
      fullWidth
      compressed
      disabled={isDisabled}
      isClearable={true}
      placeholder={
        isDisabled
          ? i18n.translate('xpack.lens.pieChart.colorPicker.auto', {
              defaultMessage: 'Auto',
            })
          : defaultColor
      }
      onChange={(color: string) => handleColorChange(color)}
      color={isDisabled ? '' : currentColor}
      aria-label={colorLabel}
      showAlpha={false}
      swatches={euiPaletteColorBlind()}
    />
  );

  return (
    <EuiFormRow display="columnCompressed" fullWidth label={colorLabel}>
      {disabledMessage ? (
        <EuiToolTip
          position="top"
          delay="long"
          anchorClassName="eui-displayBlock"
          content={disabledMessage}
        >
          {renderColorPicker()}
        </EuiToolTip>
      ) : (
        renderColorPicker()
      )}
    </EuiFormRow>
  );
}

export function DimensionDataExtraEditor(
  props: VisualizationDimensionEditorProps<PieVisualizationState> & {
    paletteService: PaletteRegistry;
  }
) {
  const currentLayer = props.state.layers.find((layer) => layer.layerId === props.layerId);

  if (!currentLayer) {
    return null;
  }

  return (
    <>
      {[...currentLayer.primaryGroups, ...(currentLayer.secondaryGroups ?? [])].includes(
        props.accessor
      ) && (
        <CollapseSetting
          value={currentLayer?.collapseFns?.[props.accessor] || ''}
          onChange={(collapseFn) => {
            props.setState({
              ...props.state,
              layers: props.state.layers.map((layer) =>
                layer.layerId !== props.layerId
                  ? layer
                  : {
                      ...layer,
                      collapseFns: {
                        ...layer.collapseFns,
                        [props.accessor]: collapseFn,
                      },
                    }
              ),
            });
          }}
        />
      )}
    </>
  );
}
