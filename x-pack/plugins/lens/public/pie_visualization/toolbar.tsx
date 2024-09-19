/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './toolbar.scss';
import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiFlexGroup,
  EuiFormRow,
  EuiSuperSelect,
  EuiRange,
  EuiHorizontalRule,
} from '@elastic/eui';
import type { Position } from '@elastic/charts';
import type { PaletteRegistry } from 'src/plugins/charts/public';
import { DEFAULT_PERCENT_DECIMALS } from './constants';
import type { PieVisualizationState, SharedPieLayerState } from '../../common/expressions';
import { VisualizationDimensionEditorProps, VisualizationToolbarProps } from '../types';
import { ToolbarPopover, LegendSettingsPopover, useDebouncedValue } from '../shared_components';
import { PalettePicker } from '../shared_components';

const numberOptions: Array<{
  value: SharedPieLayerState['numberDisplay'];
  inputDisplay: string;
}> = [
  {
    value: 'hidden',
    inputDisplay: i18n.translate('xpack.lens.pieChart.hiddenNumbersLabel', {
      defaultMessage: 'Hide from chart',
    }),
  },
  {
    value: 'percent',
    inputDisplay: i18n.translate('xpack.lens.pieChart.showPercentValuesLabel', {
      defaultMessage: 'Show percent',
    }),
  },
  {
    value: 'value',
    inputDisplay: i18n.translate('xpack.lens.pieChart.showFormatterValuesLabel', {
      defaultMessage: 'Show value',
    }),
  },
];

const categoryOptions: Array<{
  value: SharedPieLayerState['categoryDisplay'];
  inputDisplay: string;
}> = [
  {
    value: 'default',
    inputDisplay: i18n.translate('xpack.lens.pieChart.showCategoriesLabel', {
      defaultMessage: 'Inside or outside',
    }),
  },
  {
    value: 'inside',
    inputDisplay: i18n.translate('xpack.lens.pieChart.fitInsideOnlyLabel', {
      defaultMessage: 'Inside only',
    }),
  },
  {
    value: 'hide',
    inputDisplay: i18n.translate('xpack.lens.pieChart.categoriesInLegendLabel', {
      defaultMessage: 'Hide labels',
    }),
  },
];

const categoryOptionsTreemap: Array<{
  value: SharedPieLayerState['categoryDisplay'];
  inputDisplay: string;
}> = [
  {
    value: 'default',
    inputDisplay: i18n.translate('xpack.lens.pieChart.showTreemapCategoriesLabel', {
      defaultMessage: 'Show labels',
    }),
  },
  {
    value: 'hide',
    inputDisplay: i18n.translate('xpack.lens.pieChart.categoriesInLegendLabel', {
      defaultMessage: 'Hide labels',
    }),
  },
];

const legendOptions: Array<{
  value: SharedPieLayerState['legendDisplay'];
  label: string;
  id: string;
}> = [
  {
    id: 'pieLegendDisplay-default',
    value: 'default',
    label: i18n.translate('xpack.lens.pieChart.legendVisibility.auto', {
      defaultMessage: 'Auto',
    }),
  },
  {
    id: 'pieLegendDisplay-show',
    value: 'show',
    label: i18n.translate('xpack.lens.pieChart.legendVisibility.show', {
      defaultMessage: 'Show',
    }),
  },
  {
    id: 'pieLegendDisplay-hide',
    value: 'hide',
    label: i18n.translate('xpack.lens.pieChart.legendVisibility.hide', {
      defaultMessage: 'Hide',
    }),
  },
];

export function PieToolbar(props: VisualizationToolbarProps<PieVisualizationState>) {
  const { state, setState } = props;
  const layer = state.layers[0];
  if (!layer) {
    return null;
  }
  return (
    <EuiFlexGroup gutterSize="none" justifyContent="spaceBetween" responsive={false}>
      <ToolbarPopover
        title={i18n.translate('xpack.lens.pieChart.valuesLabel', {
          defaultMessage: 'Labels',
        })}
        type="labels"
        groupPosition="left"
        buttonDataTestSubj="lnsLabelsButton"
      >
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
            options={state.shape === 'treemap' ? categoryOptionsTreemap : categoryOptions}
            onChange={(option) => {
              setState({
                ...state,
                layers: [{ ...layer, categoryDisplay: option }],
              });
            }}
          />
        </EuiFormRow>
        <EuiFormRow
          label={i18n.translate('xpack.lens.pieChart.numberLabels', {
            defaultMessage: 'Values',
          })}
          fullWidth
          display="columnCompressed"
        >
          <EuiSuperSelect
            compressed
            disabled={layer.categoryDisplay === 'hide'}
            valueOfSelected={layer.categoryDisplay === 'hide' ? 'hidden' : layer.numberDisplay}
            options={numberOptions}
            onChange={(option) => {
              setState({
                ...state,
                layers: [{ ...layer, numberDisplay: option }],
              });
            }}
          />
        </EuiFormRow>
        <EuiHorizontalRule margin="s" />
        <EuiFormRow
          label={i18n.translate('xpack.lens.pieChart.percentDecimalsLabel', {
            defaultMessage: 'Maximum decimal places for percent',
          })}
          fullWidth
          display="rowCompressed"
        >
          <DecimalPlaceSlider
            value={layer.percentDecimals ?? DEFAULT_PERCENT_DECIMALS}
            setValue={(value) => {
              setState({
                ...state,
                layers: [{ ...layer, percentDecimals: value }],
              });
            }}
          />
        </EuiFormRow>
      </ToolbarPopover>
      <LegendSettingsPopover
        legendOptions={legendOptions}
        mode={layer.legendDisplay}
        onDisplayChange={(optionId) => {
          setState({
            ...state,
            layers: [
              {
                ...layer,
                legendDisplay: legendOptions.find(({ id }) => id === optionId)!.value,
              },
            ],
          });
        }}
        position={layer.legendPosition}
        onPositionChange={(id) => {
          setState({
            ...state,
            layers: [{ ...layer, legendPosition: id as Position }],
          });
        }}
        renderNestedLegendSwitch
        nestedLegend={!!layer.nestedLegend}
        onNestedLegendChange={() => {
          setState({
            ...state,
            layers: [{ ...layer, nestedLegend: !layer.nestedLegend }],
          });
        }}
        shouldTruncate={layer.truncateLegend ?? true}
        onTruncateLegendChange={() => {
          const current = layer.truncateLegend ?? true;
          setState({
            ...state,
            layers: [{ ...layer, truncateLegend: !current }],
          });
        }}
        maxLines={layer?.legendMaxLines}
        onMaxLinesChange={(val) => {
          setState({
            ...state,
            layers: [{ ...layer, legendMaxLines: val }],
          });
        }}
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

export function DimensionEditor(
  props: VisualizationDimensionEditorProps<PieVisualizationState> & {
    paletteService: PaletteRegistry;
  }
) {
  return (
    <>
      <PalettePicker
        palettes={props.paletteService}
        activePalette={props.state.palette}
        setPalette={(newPalette) => {
          props.setState({ ...props.state, palette: newPalette });
        }}
      />
    </>
  );
}
