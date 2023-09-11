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
} from '@elastic/eui';
import type { Position } from '@elastic/charts';
import { LegendSize } from '@kbn/visualizations-plugin/public';
import { useDebouncedValue } from '@kbn/visualization-ui-components';
import { DEFAULT_PERCENT_DECIMALS } from './constants';
import { PartitionChartsMeta } from './partition_charts_meta';
import { PieVisualizationState, SharedPieLayerState } from '../../../common/types';
import { LegendDisplay } from '../../../common/constants';
import { VisualizationToolbarProps } from '../../types';
import { ToolbarPopover, LegendSettingsPopover } from '../../shared_components';
import { getDefaultVisualValuesForLayer } from '../../shared_components/datasource_default_values';
import { shouldShowValuesInLegend } from './render_helpers';

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
        renderNestedLegendSwitch={
          !PartitionChartsMeta[state.shape]?.legend.hideNestedLegendSwitch &&
          layer.primaryGroups.length + (layer.secondaryGroups?.length ?? 0) > 1
        }
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
