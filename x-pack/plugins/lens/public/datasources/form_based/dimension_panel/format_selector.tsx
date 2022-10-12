/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFormRow, EuiComboBox, EuiSpacer, EuiRange, EuiFieldText } from '@elastic/eui';
import { GenericIndexPatternColumn } from '../form_based';
import { isColumnFormatted } from '../operations/definitions/helpers';
import { useDebouncedValue } from '../../../shared_components';

const supportedFormats: Record<string, { title: string; defaultDecimals?: number }> = {
  number: {
    title: i18n.translate('xpack.lens.indexPattern.numberFormatLabel', {
      defaultMessage: 'Number',
    }),
  },
  percent: {
    title: i18n.translate('xpack.lens.indexPattern.percentFormatLabel', {
      defaultMessage: 'Percent',
    }),
  },
  bytes: {
    title: i18n.translate('xpack.lens.indexPattern.bytesFormatLabel', {
      defaultMessage: 'Bytes (1024)',
    }),
  },
  bits: {
    title: i18n.translate('xpack.lens.indexPattern.bitsFormatLabel', {
      defaultMessage: 'Bits (1000)',
    }),
    defaultDecimals: 0,
  },
};

const defaultOption = {
  value: '',
  label: i18n.translate('xpack.lens.indexPattern.defaultFormatLabel', {
    defaultMessage: 'Default',
  }),
};

const singleSelectionOption = { asPlainText: true };

const label = i18n.translate('xpack.lens.indexPattern.columnFormatLabel', {
  defaultMessage: 'Value format',
});

const decimalsLabel = i18n.translate('xpack.lens.indexPattern.decimalPlacesLabel', {
  defaultMessage: 'Decimals',
});

const suffixLabel = i18n.translate('xpack.lens.indexPattern.suffixLabel', {
  defaultMessage: 'Suffix',
});

export interface FormatSelectorOptions {
  disableExtraOptions?: boolean;
}

interface FormatSelectorProps {
  selectedColumn: GenericIndexPatternColumn;
  onChange: (newFormat?: { id: string; params?: Record<string, unknown> }) => void;
  options?: FormatSelectorOptions;
}

const RANGE_MIN = 0;
const RANGE_MAX = 15;

export function FormatSelector(props: FormatSelectorProps) {
  const { selectedColumn, onChange } = props;
  const currentFormat = isColumnFormatted(selectedColumn)
    ? selectedColumn.params?.format
    : undefined;

  const [decimals, setDecimals] = useState(currentFormat?.params?.decimals ?? 2);

  const onChangeSuffix = useCallback(
    (suffix: string) => {
      if (!currentFormat) {
        return;
      }
      onChange({
        id: currentFormat.id,
        params: {
          ...currentFormat.params,
          suffix,
        },
      });
    },
    [currentFormat, onChange]
  );

  const { handleInputChange: setSuffix, inputValue: suffix } = useDebouncedValue(
    {
      onChange: onChangeSuffix,
      value: currentFormat?.params?.suffix ?? '',
    },
    { allowFalsyValue: true }
  );

  const selectedFormat = currentFormat?.id ? supportedFormats[currentFormat.id] : undefined;
  const stableOptions = useMemo(
    () => [
      defaultOption,
      ...Object.entries(supportedFormats).map(([id, format]) => ({
        value: id,
        label: format.title ?? id,
      })),
    ],
    []
  );

  const onChangeWrapped = useCallback(
    (choices) => {
      if (choices.length === 0) {
        return;
      }

      if (!choices[0].value) {
        onChange();
        return;
      }
      const id = choices[0].value;
      const defaultDecimals = supportedFormats[id].defaultDecimals;
      onChange({
        id: choices[0].value,
        params: { decimals: defaultDecimals ?? decimals },
      });
      setDecimals(defaultDecimals ?? decimals);
    },
    [onChange, decimals]
  );

  const currentOption = useMemo(
    () =>
      currentFormat
        ? [
            {
              value: currentFormat.id,
              label: selectedFormat?.title ?? currentFormat.id,
            },
          ]
        : [defaultOption],
    [currentFormat, selectedFormat?.title]
  );

  return (
    <>
      <EuiFormRow label={label} display="columnCompressed" fullWidth>
        <div>
          <EuiComboBox
            fullWidth
            compressed
            isClearable={false}
            data-test-subj="indexPattern-dimension-format"
            aria-label={label}
            singleSelection={singleSelectionOption}
            options={stableOptions}
            selectedOptions={currentOption}
            onChange={onChangeWrapped}
          />
          {currentFormat && !props.options?.disableExtraOptions ? (
            <>
              <EuiSpacer size="s" />
              <EuiRange
                showInput="inputWithPopover"
                value={decimals}
                min={RANGE_MIN}
                max={RANGE_MAX}
                onChange={(e) => {
                  const value = Number(e.currentTarget.value);
                  setDecimals(value);
                  const validatedValue = Math.min(RANGE_MAX, Math.max(RANGE_MIN, value));
                  onChange({
                    id: currentFormat.id,
                    params: {
                      ...currentFormat.params,
                      decimals: validatedValue,
                    },
                  });
                }}
                data-test-subj="indexPattern-dimension-formatDecimals"
                compressed
                fullWidth
                prepend={decimalsLabel}
                aria-label={decimalsLabel}
              />

              <EuiSpacer size="s" />
              <EuiFieldText
                value={suffix}
                onChange={(e) => {
                  setSuffix(e.currentTarget.value);
                }}
                data-test-subj="indexPattern-dimension-formatSuffix"
                compressed
                fullWidth
                prepend={suffixLabel}
                aria-label={suffixLabel}
              />
            </>
          ) : null}
        </div>
      </EuiFormRow>
    </>
  );
}
