/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { useDebounce } from 'react-use';
import { get } from 'lodash';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiFieldNumber,
  EuiText,
  EuiRange,
  EuiSwitch,
} from '@elastic/eui';
import { EuiIconTip } from '@elastic/eui';
import {
  isAutoInterval,
  IFieldFormat,
  UI_SETTINGS,
} from '../../../../../../../../src/plugins/data/common';
import { MODES, RangeColumnParams, UpdateParamsFnType, MODES_TYPES } from './ranges';
import { AdvancedRangeEditor } from './advanced_editor';

const BaseRangeEditor = ({
  autoIntervalEnabled,
  maxBars,
  interval,
  maxHistogramBars,
  onToggleEditor,
  toggleAutoInterval,
  onMaxBarsChange,
  onIntervalChange,
}: {
  autoIntervalEnabled: boolean;
  maxBars: 'auto' | number;
  interval: number;
  maxHistogramBars: number;
  onToggleEditor: () => void;
  toggleAutoInterval: (enabled: boolean) => void;
  onMaxBarsChange: (newMaxBars: number) => void;
  onIntervalChange: (newInterval: number) => void;
}) => {
  // store the value as string: storing it as Number has some issues with decimals
  const [intervalValue, setIntervalValue] = useState('' + interval);

  // Update locally all the time, but bounce the parents prop function
  // to aviod too many requests
  useDebounce(
    () => {
      if (!isNaN(Number(intervalValue))) {
        onIntervalChange(Number(intervalValue));
      }
    },
    256,
    [intervalValue]
  );

  const sectionLabel = i18n.translate('xpack.lens.indexPattern.ranges.granularity', {
    defaultMessage: 'Granularity',
  });

  return (
    <>
      <EuiFormRow
        label={sectionLabel}
        data-test-subj="indexPattern-ranges-section-label"
        labelAppend={
          <EuiSwitch
            label={i18n.translate('xpack.lens.indexPattern.ranges.autoInterval', {
              defaultMessage: 'Auto interval',
            })}
            checked={autoIntervalEnabled}
            onChange={(e) => toggleAutoInterval(e.target.checked)}
            data-test-subj="indexPattern-ranges-auto-interval"
            compressed
          />
        }
      >
        <>
          <EuiFlexGroup gutterSize="s" responsive={false} wrap>
            <EuiFlexItem>
              {autoIntervalEnabled ? (
                <EuiRange
                  compressed
                  min={1}
                  max={maxHistogramBars}
                  step={1}
                  value={maxBars === 'auto' ? '' : maxBars}
                  onChange={({ target }) =>
                    onMaxBarsChange(Number(get(target, 'value', maxHistogramBars)))
                  }
                  placeholder={i18n.translate('xpack.lens.indexPattern.ranges.autoIntervals', {
                    defaultMessage: 'Auto',
                  })}
                  showLabels
                  showInput="inputWithPopover"
                  prepend={
                    <>
                      <EuiText size="s">
                        {i18n.translate('xpack.lens.indexPattern.ranges.maxIntervals', {
                          defaultMessage: 'Max intervals',
                        })}
                      </EuiText>{' '}
                      <EuiIconTip
                        position="right"
                        content={i18n.translate('xpack.lens.indexPattern.ranges.maxIntervalsHelp', {
                          defaultMessage:
                            "Intervals will be selected automatically based on the available data. The maximum number of bars can never be greater than the Advanced Setting's {histogramMaxBars}",
                          values: { histogramMaxBars: UI_SETTINGS.HISTOGRAM_MAX_BARS },
                        })}
                        type="questionInCircle"
                      />
                    </>
                  }
                />
              ) : (
                <EuiFieldNumber
                  compressed
                  data-test-subj="lns-indexPattern-range-interval-field"
                  value={intervalValue}
                  step="any"
                  onChange={({ target }) => setIntervalValue(target.value)}
                  prepend={
                    <>
                      <EuiText size="s">
                        {i18n.translate('xpack.lens.indexPattern.ranges.min', {
                          defaultMessage: 'Min interval',
                        })}
                      </EuiText>{' '}
                      <EuiIconTip
                        position="right"
                        content={i18n.translate('xpack.lens.indexPattern.ranges.minIntervalsHelp', {
                          defaultMessage:
                            "Interval will be automatically scaled in the event that the provided value creates more buckets than specified by Advanced Setting's {histogramMaxBars}",
                          values: { histogramMaxBars: UI_SETTINGS.HISTOGRAM_MAX_BARS },
                        })}
                        type="questionInCircle"
                      />
                    </>
                  }
                />
              )}
            </EuiFlexItem>
          </EuiFlexGroup>

          <EuiButtonEmpty size="xs" iconType="controlsHorizontal" onClick={() => onToggleEditor()}>
            {i18n.translate('xpack.lens.indexPattern.ranges.customIntervalsToggle', {
              defaultMessage: 'Create custom intervals',
            })}
          </EuiButtonEmpty>
        </>
      </EuiFormRow>
    </>
  );
};

export const RangeEditor = ({
  onAutoIntervalToggle,
  setParam,
  params,
  maxHistogramBars,
  onChangeMode,
  rangeFormatter,
}: {
  params: RangeColumnParams;
  maxHistogramBars: number;
  setParam: UpdateParamsFnType;
  onAutoIntervalToggle: (enabled: boolean) => void;
  onChangeMode: (mode: MODES_TYPES) => void;
  rangeFormatter: IFieldFormat;
}) => {
  const [isAdvancedEditor, toggleAdvancedEditor] = useState(params.type === MODES.Range);
  const isAutoIntervalEnabled = isAutoInterval(params.interval);
  const numericIntervalValue: number = isAutoIntervalEnabled ? 0 : (params.interval as number);

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
      autoIntervalEnabled={isAutoIntervalEnabled}
      interval={numericIntervalValue}
      maxBars={params.maxBars}
      maxHistogramBars={maxHistogramBars}
      toggleAutoInterval={onAutoIntervalToggle}
      onMaxBarsChange={(maxBars: number) => {
        setParam('maxBars', maxBars);
      }}
      onIntervalChange={(interval: number) => {
        setParam('interval', interval);
      }}
      onToggleEditor={() => {
        onChangeMode(MODES.Range);
        toggleAdvancedEditor(true);
      }}
    />
  );
};
