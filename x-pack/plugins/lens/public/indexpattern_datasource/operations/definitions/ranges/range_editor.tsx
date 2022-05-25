/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
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
  EuiFieldNumber,
  EuiFormControlLayoutDelimited,
} from '@elastic/eui';
import type { IFieldFormat } from '@kbn/field-formats-plugin/common';
import { UI_SETTINGS } from '@kbn/data-plugin/public';
import { ExtendedBounds } from '@kbn/data-plugin/common';
import { RangeColumnParams, UpdateParamsFnType, MODES_TYPES } from './ranges';
import { AdvancedRangeEditor } from './advanced_editor';
import { MODES, MIN_HISTOGRAM_BARS } from './constants';
import { useDebouncedValue } from '../../../../shared_components';
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

function isValidBound(
  bounds?: { min?: number; max?: number } | undefined
): bounds is Required<ExtendedBounds> {
  return boundsValidation(bounds);
}

function boundsValidation(bounds?: { min?: number; max?: number }) {
  return bounds?.min != null && bounds?.max != null && bounds?.min < bounds?.max;
}

const BaseRangeEditor = ({
  maxBars,
  step,
  maxHistogramBars,
  onToggleEditor,
  onMaxBarsChange,
  includeEmptyRows,
  onChangeIncludeEmptyRows,
  customBounds,
  onChangeCustomBounds,
  dataBounds,
}: {
  maxBars: number;
  step: number;
  maxHistogramBars: number;
  onToggleEditor: () => void;
  onMaxBarsChange: (newMaxBars: number) => void;
  onChangeIncludeEmptyRows: (includeEmptyRows: boolean) => void;
  includeEmptyRows?: boolean;
  customBounds?: ExtendedBounds;
  onChangeCustomBounds: (newBounds?: Required<ExtendedBounds>) => void;
  dataBounds: { min: number; max: number } | undefined;
}) => {
  const onChangeMaxBars = useCallback(
    (maxBarsValue: string) => {
      onMaxBarsChange(Number(maxBarsValue));
    },
    [onMaxBarsChange]
  );
  const { inputValue: maxBarsValue, handleInputChange: setMaxBarsValue } =
    useDebouncedValue<string>({
      value: String(maxBars),
      onChange: onChangeMaxBars,
    });
  const onChangeCustomBoundsWithValidation = useCallback(
    (newBounds: { min?: number; max?: number } | undefined) => {
      if (!newBounds || isValidBound(newBounds)) {
        onChangeCustomBounds(newBounds);
      }
    },
    [onChangeCustomBounds]
  );
  const { inputValue: localBounds, handleInputChange: handleBoundsChange } = useDebouncedValue<
    { min?: number; max?: number } | undefined
  >({
    onChange: onChangeCustomBoundsWithValidation,
    value: customBounds,
  });
  const boundaryError = !boundsValidation(localBounds);

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
      <EuiFormRow display="rowCompressed" hasChildLabel={false}>
        <EuiSwitch
          label={i18n.translate('xpack.lens.indexPattern.ranges.customExtents', {
            defaultMessage: 'Extend bounds',
          })}
          disabled={!includeEmptyRows}
          checked={Boolean(localBounds && includeEmptyRows)}
          onChange={({ target }) => {
            handleBoundsChange(target.checked ? localBounds ?? dataBounds ?? {} : undefined);
          }}
          compressed
        />
      </EuiFormRow>
      {localBounds && includeEmptyRows ? (
        <EuiFormRow
          display="rowCompressed"
          fullWidth
          isInvalid={boundaryError}
          label={i18n.translate('xpack.lens.indexPattern.ranges.customExtentsLabel', {
            defaultMessage: 'Custom bounds',
          })}
          error={
            boundaryError
              ? i18n.translate('xpack.lens.indexPattern.ranges.boundaryError', {
                  defaultMessage: 'Lower bound has to be larger than upper bound',
                })
              : undefined
          }
          helpText={i18n.translate('xpack.lens.indexPattern.ranges.extendBoundsHelp', {
            defaultMessage: 'Bounds that filter current data are ignored.',
          })}
        >
          <EuiFormControlLayoutDelimited
            data-test-subj="lns-indexPattern-range-custom-extents"
            startControl={
              <EuiFieldNumber
                compressed
                value={localBounds?.min ?? ''}
                isInvalid={boundaryError}
                data-test-subj="lns-indexPattern-range-lower-bound"
                onChange={(e) => {
                  const val = Number(e.target.value);
                  const shouldReset = e.target.value === '' || Number.isNaN(Number(val));
                  handleBoundsChange({
                    ...localBounds,
                    min: shouldReset ? undefined : val,
                  });
                }}
                step="any"
                controlOnly
              />
            }
            endControl={
              <EuiFieldNumber
                compressed
                value={localBounds?.max ?? ''}
                data-test-subj="lns-indexPattern-range-upper-bound"
                onChange={(e) => {
                  const val = Number(e.target.value);
                  const shouldReset = e.target.value === '' || Number.isNaN(Number(val));
                  handleBoundsChange({
                    ...localBounds,
                    max: shouldReset ? undefined : val,
                  });
                }}
                step="any"
                controlOnly
              />
            }
            compressed
          />
        </EuiFormRow>
      ) : null}
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
  dataBounds,
}: {
  params: RangeColumnParams;
  maxHistogramBars: number;
  maxBars: number;
  granularityStep: number;
  setParam: UpdateParamsFnType;
  onChangeMode: (mode: MODES_TYPES) => void;
  rangeFormatter: IFieldFormat;
  dataBounds: { min: number; max: number } | undefined;
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
      customBounds={params.customBounds}
      dataBounds={dataBounds}
      onMaxBarsChange={(newMaxBars: number) => {
        setParam('maxBars', newMaxBars);
      }}
      onChangeIncludeEmptyRows={(includeEmptyRows: boolean) => {
        setParam('includeEmptyRows', includeEmptyRows);
      }}
      onChangeCustomBounds={(customBounds?: Required<ExtendedBounds>) => {
        setParam('customBounds', customBounds);
      }}
      onToggleEditor={() => {
        onChangeMode(MODES.Range);
        toggleAdvancedEditor(true);
      }}
    />
  );
};
