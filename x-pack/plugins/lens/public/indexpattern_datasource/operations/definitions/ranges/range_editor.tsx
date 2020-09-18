/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { useDebounce } from 'react-use';
import { EuiButtonEmpty, EuiFormRow, EuiRange, EuiFlexItem, EuiFlexGroup } from '@elastic/eui';
import { IFieldFormat } from 'src/plugins/data/public';
import { RangeColumnParams, UpdateParamsFnType, MODES_TYPES } from './ranges';
import { AdvancedRangeEditor } from './advanced_editor';
import { TYPING_DEBOUNCE_TIME, AUTO_BARS, MODES, MIN_HISTOGRAM_BARS } from './constants';

const BaseRangeEditor = ({
  maxBars,
  step,
  maxHistogramBars,
  onToggleEditor,
  onMaxBarsChange,
}: {
  maxBars: number;
  step: number;
  maxHistogramBars: number;
  onToggleEditor: () => void;
  onMaxBarsChange: (newMaxBars: number) => void;
}) => {
  const [maxBarsValue, setMaxBarsValue] = useState(String(maxBars));

  useDebounce(
    () => {
      onMaxBarsChange(Number(maxBarsValue));
    },
    TYPING_DEBOUNCE_TIME,
    [maxBarsValue]
  );

  return (
    <>
      <EuiFormRow
        label={i18n.translate('xpack.lens.indexPattern.ranges.granularity', {
          defaultMessage: 'Granularity',
        })}
        data-test-subj="indexPattern-ranges-section-label"
      >
        <EuiFlexGroup alignItems="center" gutterSize="xs">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="xs"
              iconType="minusInCircle"
              onClick={() =>
                setMaxBarsValue('' + Math.max(Number(maxBarsValue) - step, MIN_HISTOGRAM_BARS))
              }
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiRange
              compressed
              data-test-subj="lns-indexPattern-range-maxBars-field"
              min={MIN_HISTOGRAM_BARS}
              max={maxHistogramBars}
              step={step}
              value={maxBarsValue}
              onChange={({ currentTarget }) => setMaxBarsValue(currentTarget.value)}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="xs"
              iconType="plusInCircle"
              onClick={() =>
                setMaxBarsValue('' + Math.min(Number(maxBarsValue) + step, maxHistogramBars))
              }
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFormRow>
      <EuiFormRow hasChildLabel={false} display="rowCompressed">
        <EuiButtonEmpty size="xs" iconType="controlsHorizontal" onClick={() => onToggleEditor()}>
          {i18n.translate('xpack.lens.indexPattern.ranges.customIntervalsToggle', {
            defaultMessage: 'Create custom intervals',
          })}
        </EuiButtonEmpty>
      </EuiFormRow>
    </>
  );
};

export const RangeEditor = ({
  setParam,
  params,
  maxHistogramBars,
  maxBars,
  granularityStep,
  onChangeMode,
  rangeFormatter,
}: {
  params: RangeColumnParams;
  maxHistogramBars: number;
  maxBars: number;
  granularityStep: number;
  setParam: UpdateParamsFnType;
  onChangeMode: (mode: MODES_TYPES) => void;
  rangeFormatter: IFieldFormat;
}) => {
  const [isAdvancedEditor, toggleAdvancedEditor] = useState(params.type === MODES.Range);

  // if the maxBars in the params is set to auto refresh it with the default value
  // only on bootstrap
  useEffect(() => {
    if (params.maxBars !== maxBars) {
      setParam('maxBars', maxBars);
    }
  }, [maxBars, params.maxBars, setParam]);

  if (isAdvancedEditor) {
    return (
      <AdvancedRangeEditor
        ranges={params.ranges}
        setRanges={(ranges) => {
          setParam('ranges', ranges);
        }}
        onToggleEditor={() => {
          onChangeMode(MODES.Histogram);
          toggleAdvancedEditor(false);
        }}
        formatter={rangeFormatter}
      />
    );
  }

  return (
    <BaseRangeEditor
      maxBars={maxBars}
      step={granularityStep}
      maxHistogramBars={maxHistogramBars}
      onMaxBarsChange={(newMaxBars: number) => {
        setParam('maxBars', newMaxBars);
      }}
      onToggleEditor={() => {
        onChangeMode(MODES.Range);
        toggleAdvancedEditor(true);
      }}
    />
  );
};
