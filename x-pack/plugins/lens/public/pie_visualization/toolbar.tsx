/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import './toolbar.scss';
import React, { useState } from 'react';
import { useDebounce } from 'react-use';
import { i18n } from '@kbn/i18n';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiSelect,
  EuiFormRow,
  EuiSuperSelect,
  EuiRange,
  EuiSwitch,
  EuiHorizontalRule,
  EuiSpacer,
  EuiButtonGroup,
} from '@elastic/eui';
import { Position } from '@elastic/charts';
import { DEFAULT_PERCENT_DECIMALS } from './constants';
import { PieVisualizationState, SharedLayerState } from './types';
import { VisualizationToolbarProps } from '../types';
import { ToolbarButton } from '../toolbar_button';

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
      defaultMessage: 'auto',
    }),
  },
  {
    id: 'pieLegendDisplay-show',
    value: 'show',
    label: i18n.translate('xpack.lens.pieChart.legendVisibility.show', {
      defaultMessage: 'show',
    }),
  },
  {
    id: 'pieLegendDisplay-hide',
    value: 'hide',
    label: i18n.translate('xpack.lens.pieChart.legendVisibility.hide', {
      defaultMessage: 'hide',
    }),
  },
];

export function PieToolbar(props: VisualizationToolbarProps<PieVisualizationState>) {
  const [open, setOpen] = useState(false);
  const { state, setState } = props;
  const layer = state.layers[0];
  if (!layer) {
    return null;
  }
  return (
    <EuiFlexGroup justifyContent="flexEnd">
      <EuiFlexItem grow={false}>
        <EuiPopover
          panelClassName="lnsPieToolbar__popover"
          button={
            <ToolbarButton
              fontWeight="normal"
              onClick={() => {
                setOpen(!open);
              }}
            >
              {i18n.translate('xpack.lens.pieChart.settingsLabel', { defaultMessage: 'Settings' })}
            </ToolbarButton>
          }
          isOpen={open}
          closePopover={() => {
            setOpen(false);
          }}
          anchorPosition="downRight"
        >
          <EuiFormRow
            label={i18n.translate('xpack.lens.pieChart.labelPositionLabel', {
              defaultMessage: 'Label position',
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
              defaultMessage: 'Label values',
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
              defaultMessage: 'Decimal places for percent',
            })}
            fullWidth
            display="columnCompressed"
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
          <EuiHorizontalRule margin="s" />
          <EuiFormRow
            label={i18n.translate('xpack.lens.pieChart.legendDisplayLabel', {
              defaultMessage: 'Legend display',
            })}
            display="columnCompressed"
          >
            <div>
              <EuiButtonGroup
                legend={i18n.translate('xpack.lens.pieChart.legendDisplayLegend', {
                  defaultMessage: 'Legend display',
                })}
                options={legendOptions}
                idSelected={legendOptions.find(({ value }) => value === layer.legendDisplay)!.id}
                onChange={(optionId) => {
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
                buttonSize="compressed"
                isFullWidth
              />

              <EuiSpacer size="s" />
              <EuiSwitch
                compressed
                label={i18n.translate('xpack.lens.pieChart.nestedLegendLabel', {
                  defaultMessage: 'Nested legend',
                })}
                disabled={layer.legendDisplay === 'hide'}
                checked={!!layer.nestedLegend}
                onChange={() => {
                  setState({ ...state, layers: [{ ...layer, nestedLegend: !layer.nestedLegend }] });
                }}
              />
            </div>
          </EuiFormRow>
          <EuiFormRow
            display="columnCompressed"
            label={i18n.translate('xpack.lens.xyChart.legendPositionLabel', {
              defaultMessage: 'Legend position',
            })}
          >
            <EuiSelect
              compressed
              disabled={layer.legendDisplay === 'hide'}
              options={[
                { value: Position.Top, text: 'Top' },
                { value: Position.Left, text: 'Left' },
                { value: Position.Right, text: 'Right' },
                { value: Position.Bottom, text: 'Bottom' },
              ]}
              value={layer.legendPosition || Position.Right}
              onChange={(e) => {
                setState({
                  ...state,
                  layers: [{ ...layer, legendPosition: e.target.value as Position }],
                });
              }}
            />
          </EuiFormRow>
        </EuiPopover>
      </EuiFlexItem>
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
