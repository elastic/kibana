/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFormRow, EuiComboBox, EuiSpacer, EuiRange } from '@elastic/eui';
import { GenericIndexPatternColumn } from '../indexpattern';
import { isColumnFormatted } from '../operations/definitions/helpers';

const supportedFormats: Record<string, { title: string }> = {
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

interface FormatSelectorProps {
  selectedColumn: GenericIndexPatternColumn;
  onChange: (newFormat?: { id: string; params?: Record<string, unknown> }) => void;
}

const RANGE_MIN = 0;
const RANGE_MAX = 15;

export function FormatSelector(props: FormatSelectorProps) {
  const { selectedColumn, onChange } = props;
  const currentFormat = isColumnFormatted(selectedColumn)
    ? selectedColumn.params?.format
    : undefined;

  const [decimals, setDecimals] = useState(currentFormat?.params?.decimals ?? 2);

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
      onChange({
        id: choices[0].value,
        params: { decimals },
      });
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
          {currentFormat ? (
            <>
              <EuiSpacer size="xs" />
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
            </>
          ) : null}
        </div>
      </EuiFormRow>
    </>
  );
}
