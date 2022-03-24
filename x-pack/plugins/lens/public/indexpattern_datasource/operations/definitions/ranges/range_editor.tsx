/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiCode,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiRange,
  EuiToolTip,
  EuiSwitch,
  EuiSpacer,
} from '@elastic/eui';
import type { IFieldFormat } from 'src/plugins/field_formats/common';
import { UI_SETTINGS } from '../../../../../../../../src/plugins/data/public';
import { RangeColumnParams, UpdateParamsFnType, MODES_TYPES } from './ranges';
import { AdvancedRangeEditor } from './advanced_editor';
import { TYPING_DEBOUNCE_TIME, MODES, MIN_HISTOGRAM_BARS } from './constants';
import { useDebounceWithOptions } from '../../../../shared_components';
import { HelpPopover, HelpPopoverButton } from '../../../help_popover';

const GranularityHelpPopover = () => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  return (
    <HelpPopover
      anchorPosition="upCenter"
      button={
        <HelpPopoverButton
          onClick={() => {
            setIsPopoverOpen(!isPopoverOpen);
          }}
        >
          {i18n.translate('xpack.lens.indexPattern.ranges.granularityHelpText', {
            defaultMessage: 'How it works',
          })}
        </HelpPopoverButton>
      }
      closePopover={() => setIsPopoverOpen(false)}
      isOpen={isPopoverOpen}
      title={i18n.translate('xpack.lens.indexPattern.ranges.granularityPopoverTitle', {
        defaultMessage: 'How granularity interval works',
      })}
    >
      <p>
        {i18n.translate('xpack.lens.indexPattern.ranges.granularityPopoverBasicExplanation', {
          defaultMessage:
            'Interval granularity divides the field into evenly spaced intervals based on the minimum and maximum values for the field.',
        })}
      </p>

      <p>
        <FormattedMessage
          id="xpack.lens.indexPattern.ranges.granularityPopoverExplanation"
          defaultMessage='The size of the interval is a "nice" value. When the granularity of the slider changes, the interval stays the same when the “nice” interval is the same. The minimum granularity is 1, and the maximum value is
            {setting}. To change the maximum granularity, go to Advanced settings.'
          values={{
            setting: <EuiCode>{UI_SETTINGS.HISTOGRAM_MAX_BARS}</EuiCode>,
          }}
        />
      </p>

      <p>
        {i18n.translate('xpack.lens.indexPattern.ranges.granularityPopoverAdvancedExplanation', {
          defaultMessage:
            'Intervals are incremented by 10, 5 or 2. For example, an interval can be 100 or 0.2 .',
        })}
      </p>
    </HelpPopover>
  );
};

const BaseRangeEditor = ({
  maxBars,
  step,
  maxHistogramBars,
  onToggleEditor,
  onMaxBarsChange,
  includeEmptyRows,
  onChangeIncludeEmptyRows,
}: {
  maxBars: number;
  step: number;
  maxHistogramBars: number;
  onToggleEditor: () => void;
  onMaxBarsChange: (newMaxBars: number) => void;
  onChangeIncludeEmptyRows: (includeEmptyRows: boolean) => void;
  includeEmptyRows?: boolean;
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

  const decreaseButtonLabel = i18n.translate('xpack.lens.indexPattern.ranges.decreaseButtonLabel', {
    defaultMessage: 'Decrease granularity',
  });
  const increaseButtonLabel = i18n.translate('xpack.lens.indexPattern.ranges.increaseButtonLabel', {
    defaultMessage: 'Increase granularity',
  });

  return (
    <>
      <EuiFormRow
        label={granularityLabel}
        data-test-subj="indexPattern-ranges-section-label"
        labelType="legend"
        fullWidth
        display="rowCompressed"
        labelAppend={<GranularityHelpPopover />}
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
      <EuiSpacer size="s" />
      <EuiFormRow display="rowCompressed" hasChildLabel={false}>
        <EuiSwitch
          label={i18n.translate('xpack.lens.indexPattern.ranges.includeEmptyRows', {
            defaultMessage: 'Include empty rows',
          })}
          checked={Boolean(includeEmptyRows)}
          onChange={() => {
            onChangeIncludeEmptyRows(!includeEmptyRows);
          }}
          compressed
        />
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
      includeEmptyRows={params.includeEmptyRows}
      maxBars={maxBars}
      step={granularityStep}
      maxHistogramBars={maxHistogramBars}
      onMaxBarsChange={(newMaxBars: number) => {
        setParam('maxBars', newMaxBars);
      }}
      onChangeIncludeEmptyRows={(includeEmptyRows: boolean) => {
        setParam('includeEmptyRows', includeEmptyRows);
      }}
      onToggleEditor={() => {
        onChangeMode(MODES.Range);
        toggleAdvancedEditor(true);
      }}
    />
  );
};
