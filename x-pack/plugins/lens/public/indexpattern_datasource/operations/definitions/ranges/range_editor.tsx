/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiButtonEmpty,
  EuiFormRow,
  EuiRange,
  EuiFlexItem,
  EuiFlexGroup,
  EuiButtonIcon,
  EuiToolTip,
  EuiIconTip,
} from '@elastic/eui';
import { IFieldFormat } from 'src/plugins/data/public';
import { RangeColumnParams, UpdateParamsFnType, MODES_TYPES } from './ranges';
import { AdvancedRangeEditor } from './advanced_editor';
import { TYPING_DEBOUNCE_TIME, MODES, MIN_HISTOGRAM_BARS } from './constants';
import { useDebounceWithOptions } from '../helpers';

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

  useDebounceWithOptions(
    () => {
      onMaxBarsChange(Number(maxBarsValue));
    },
    { skipFirstRender: true },
    TYPING_DEBOUNCE_TIME,
    [maxBarsValue]
  );

  const granularityLabel = i18n.translate('xpack.lens.indexPattern.ranges.granularity', {
    defaultMessage: 'Intervals granularity',
  });
  const granularityLabelDescription = i18n.translate(
    'xpack.lens.indexPattern.ranges.granularityDescription',
    {
      defaultMessage: 'Divides the field into evenly spaced intervals.',
    }
  );
  const decreaseButtonLabel = i18n.translate('xpack.lens.indexPattern.ranges.decreaseButtonLabel', {
    defaultMessage: 'Decrease granularity',
  });
  const increaseButtonLabel = i18n.translate('xpack.lens.indexPattern.ranges.increaseButtonLabel', {
    defaultMessage: 'Increase granularity',
  });

  return (
    <>
      <EuiFormRow
        label={
          <>
            {granularityLabel}{' '}
            <EuiIconTip
              position="right"
              content={granularityLabelDescription}
              type="questionInCircle"
              color="subdued"
            />
          </>
        }
        data-test-subj="indexPattern-ranges-section-label"
        labelType="legend"
        fullWidth
        display="rowCompressed"
      >
        <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiToolTip content={decreaseButtonLabel} delay="long">
              <EuiButtonIcon
                iconType="minusInCircle"
                color="text"
                data-test-subj="lns-indexPattern-range-maxBars-minus"
                onClick={() =>
                  setMaxBarsValue('' + Math.max(Number(maxBarsValue) - step, MIN_HISTOGRAM_BARS))
                }
                aria-label={decreaseButtonLabel}
              />
            </EuiToolTip>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiRange
              compressed
              fullWidth
              aria-label={granularityLabel}
              data-test-subj="lns-indexPattern-range-maxBars-field"
              min={MIN_HISTOGRAM_BARS}
              max={maxHistogramBars}
              step={step}
              value={maxBarsValue}
              onChange={({ currentTarget }) => setMaxBarsValue(currentTarget.value)}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiToolTip content={increaseButtonLabel} delay="long">
              <EuiButtonIcon
                iconType="plusInCircle"
                color="text"
                data-test-subj="lns-indexPattern-range-maxBars-plus"
                onClick={() =>
                  setMaxBarsValue('' + Math.min(Number(maxBarsValue) + step, maxHistogramBars))
                }
                aria-label={increaseButtonLabel}
              />
            </EuiToolTip>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFormRow>

      <EuiButtonEmpty size="xs" iconType="controlsHorizontal" onClick={() => onToggleEditor()}>
        {i18n.translate('xpack.lens.indexPattern.ranges.customIntervalsToggle', {
          defaultMessage: 'Create custom ranges',
        })}
      </EuiButtonEmpty>
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

  // if the maxBars in the params is set to auto refresh it with the default value only on bootstrap
  useEffect(() => {
    if (!isAdvancedEditor) {
      if (params.maxBars !== maxBars) {
        setParam('maxBars', maxBars);
      }
    }
  }, [maxBars, params.maxBars, setParam, isAdvancedEditor]);

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
