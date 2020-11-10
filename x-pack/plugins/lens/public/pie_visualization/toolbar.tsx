/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import './toolbar.scss';
import React, { useState } from 'react';
import useDebounce from 'react-use/lib/useDebounce';
import { i18n } from '@kbn/i18n';
import {
  EuiFlexGroup,
  EuiFormRow,
  EuiSuperSelect,
  EuiRange,
  EuiHorizontalRule,
} from '@elastic/eui';
import { Position } from '@elastic/charts';
import { DEFAULT_PERCENT_DECIMALS } from './constants';
import { PieVisualizationState, SharedLayerState } from './types';
import { VisualizationDimensionEditorProps, VisualizationToolbarProps } from '../types';
import { ToolbarPopover, LegendSettingsPopover } from '../shared_components';
import { PalettePicker } from '../shared_components';

const numberOptions: Array<{ value: SharedLayerState['numberDisplay']; inputDisplay: string }> = [
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
  value: SharedLayerState['categoryDisplay'];
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
  value: SharedLayerState['categoryDisplay'];
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
  value: SharedLayerState['legendDisplay'];
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
    <EuiFlexGroup gutterSize="none" justifyContent="spaceBetween">
      <ToolbarPopover
        title={i18n.translate('xpack.lens.pieChart.valuesLabel', {
          defaultMessage: 'Labels',
        })}
        type="values"
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
            setValue={(value) =>
              setState({
                ...state,
                layers: [{ ...layer, percentDecimals: value }],
              })
            }
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
  const [localValue, setLocalValue] = useState(value);
  useDebounce(() => setValue(localValue), 256, [localValue]);

  return (
    <EuiRange
      data-test-subj="indexPattern-dimension-formatDecimals"
      value={localValue}
      min={0}
      max={10}
      showInput
      compressed
      onChange={(e) => {
        setLocalValue(Number(e.currentTarget.value));
      }}
    />
  );
};

export function DimensionEditor(props: VisualizationDimensionEditorProps<PieVisualizationState>) {
  return (
    <>
      <PalettePicker
        palettes={props.frame.availablePalettes}
        activePalette={props.state.palette}
        setPalette={(newPalette) => {
          props.setState({ ...props.state, palette: newPalette });
        }}
      />
    </>
  );
}
