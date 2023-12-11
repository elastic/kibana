/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiComboBox, EuiSpacer } from '@elastic/eui';
import { DURATION_INPUT_FORMATS, DURATION_OUTPUT_FORMATS } from '@kbn/field-formats-plugin/common';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { Prepend } from '../../../../shared_components/prepend_provider';

function getNewHumanizeOutputLabel({ text, method }: { text: string; method: string }): {
  label: string;
  value: string;
} {
  if (method === 'humanize') {
    return {
      label: i18n.translate('xpack.lens.indexPattern.duration.humanizeLabel', {
        defaultMessage: 'Friendly (approximate)',
      }),
      value: method,
    };
  }
  if (method === 'humanizePrecise') {
    return {
      label: i18n.translate('xpack.lens.indexPattern.duration.humanizePreciseLabel', {
        defaultMessage: 'Friendly (precise)',
      }),
      value: method,
    };
  }
  return { label: text, value: method };
}

export const durationOutputOptions = DURATION_OUTPUT_FORMATS.map(getNewHumanizeOutputLabel);
export const durationInputOptions = DURATION_INPUT_FORMATS.map(({ text, kind }) => ({
  label: text,
  value: kind,
}));

interface DurationInputProps {
  testSubjLayout?: string;
  testSubjStart?: string;
  testSubjEnd?: string;
  onStartChange: (newStartValue: string) => void;
  onEndChange: (newEndValue: string) => void;
  startValue: string | undefined;
  endValue: string | undefined;
}

function getSelectedOption(
  inputValue: string,
  list: Array<{ label: string; value: string }>
): Array<{ label: string; value: string }> {
  const option = list.find(({ value }) => inputValue === value);
  return option ? [option] : [];
}

export const DurationRowInputs = ({
  testSubjLayout,
  testSubjStart,
  testSubjEnd,
  startValue = 'milliseconds',
  endValue = 'seconds',
  onStartChange,
  onEndChange,
}: DurationInputProps) => {
  return (
    <>
      <EuiComboBox
        prepend={
          <Prepend>
            {i18n.translate('xpack.lens.indexPattern.duration.fromLabel', {
              defaultMessage: 'Convert',
            })}
          </Prepend>
        }
        isClearable={false}
        options={durationInputOptions}
        selectedOptions={getSelectedOption(startValue, durationInputOptions)}
        onChange={([newStartValue]) => onStartChange(newStartValue.value!)}
        singleSelection={{ asPlainText: true }}
        data-test-subj={testSubjStart}
        compressed
      />
      <EuiSpacer size="s" />
      <EuiComboBox
        prepend={
          <Prepend>
            {i18n.translate('xpack.lens.indexPattern.custom.toLabel', {
              defaultMessage: 'To',
            })}
          </Prepend>
        }
        isClearable={false}
        options={durationOutputOptions}
        selectedOptions={getSelectedOption(endValue, durationOutputOptions)}
        onChange={([newEndChange]) => onEndChange(newEndChange.value!)}
        singleSelection={{ asPlainText: true }}
        data-test-subj={testSubjEnd}
        compressed
      />
    </>
  );
};
