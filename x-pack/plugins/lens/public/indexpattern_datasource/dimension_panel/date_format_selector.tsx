/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFormRow, EuiComboBoxOptionOption, EuiFieldText, EuiComboBox } from '@elastic/eui';
import { IndexPatternColumn } from '../indexpattern';
import { FormattedIndexPatternColumn } from '../operations/definitions/column_types';

const supportedFormats = {
  iso: {
    title: i18n.translate('xpack.lens.indexPattern.numberFormatLabel', {
      defaultMessage: 'ISO8601',
    }),
    pattern: 'YYYY-MM-DDTHH:mm:ssZ',
  },
  fullDate: {
    title: i18n.translate('xpack.lens.indexPattern.percentFormatLabel', {
      defaultMessage: 'YYYY-MM-DD',
    }),
    pattern: 'YYYY-MM-DD',
  },
  shortDate: {
    title: i18n.translate('xpack.lens.indexPattern.bytesFormatLabel', {
      defaultMessage: 'YY-MM-DD',
    }),
    pattern: 'YY-MM-DD',
  },
  monthDate: {
    title: i18n.translate('xpack.lens.indexPattern.bytesFormatLabel', {
      defaultMessage: 'MM/DD',
    }),
    pattern: 'MM/DD',
  },
  fullTime: {
    title: i18n.translate('xpack.lens.indexPattern.bytesFormatLabel', {
      defaultMessage: 'HH:mm:ssss',
    }),
    pattern: 'HH:mm:ssss',
  },
  shortTime: {
    title: i18n.translate('xpack.lens.indexPattern.bytesFormatLabel', {
      defaultMessage: 'h:mm a',
    }),
    pattern: 'h:mm a',
  },
} as const;

export type FormatState =
  | { mode: 'default' }
  | { mode: 'custom'; pattern?: string }
  | { mode: keyof typeof supportedFormats };

interface FormatSelectorProps {
  selectedColumn: IndexPatternColumn;
  onChange: (newFormat?: { id: string; params?: Record<string, unknown> }) => void;
}

function getTitle(mode: FormatState['mode']) {
  if (mode in supportedFormats) {
    return supportedFormats[mode as keyof typeof supportedFormats].title;
  } else if (mode === 'default') {
    return i18n.translate('xpack.lens.indexPattern.defaultFormatLabel', {
      defaultMessage: 'Default',
    });
  } else {
    return i18n.translate('xpack.lens.indexPattern.defaultFormatLabel', {
      defaultMessage: 'Custom format',
    });
  }
}

function getFormatState(column: IndexPatternColumn, forceCustom: boolean): FormatState {
  if (!('params' in column && column.params && 'format' in column.params)) {
    return { mode: 'default' };
  }
  const formattedColumn = column as FormattedIndexPatternColumn;
  if (formattedColumn.params?.format?.id !== 'date') {
    return { mode: 'default' };
  }

  const existingFormatOption = Object.entries(supportedFormats).find(
    ([_, format]) => formattedColumn.params?.format?.params?.pattern === format.pattern
  );

  if (existingFormatOption && !forceCustom) {
    return {
      mode: existingFormatOption[0] as keyof typeof supportedFormats,
    };
  }

  return {
    mode: 'custom',
    pattern: column.params?.format?.params?.pattern,
  };
}

export function DateFormatSelector(props: FormatSelectorProps) {
  const { selectedColumn, onChange } = props;

  const [isEditingCustomFormat, setEditingCustomFormat] = useState(false);

  const formatState = getFormatState(selectedColumn, isEditingCustomFormat);

  const defaultOption = {
    value: 'default',
    label: getTitle('default'),
  } as const;

  const customOption = {
    value: 'custom',
    label: getTitle('custom'),
  } as const;

  return (
    <>
      <EuiFormRow
        label={i18n.translate('xpack.lens.indexPattern.columnFormatLabel', {
          defaultMessage: 'Value format',
        })}
        display="rowCompressed"
      >
        <EuiComboBox
          fullWidth
          compressed
          isClearable={false}
          data-test-subj="indexPattern-dimension-format"
          singleSelection={{ asPlainText: true }}
          options={
            [
              defaultOption,
              ...Object.entries(supportedFormats).map(([id, format]) => ({
                value: id,
                label: format.title,
              })),
              customOption,
            ] as Array<{ value: FormatState['mode']; label: string }>
          }
          selectedOptions={[
            {
              value: formatState.mode,
              label: getTitle(formatState.mode),
            },
          ]}
          onChange={(choices: Array<EuiComboBoxOptionOption<FormatState['mode']>>) => {
            if (choices.length === 0) {
              return;
            }

            if (!choices[0].value || choices[0].value === 'default') {
              onChange();
              return;
            }
            setEditingCustomFormat(choices[0].value === 'custom');

            onChange({
              id: 'date',
              params: {
                pattern:
                  choices[0].value === 'custom'
                    ? undefined
                    : supportedFormats[choices[0].value].pattern,
              },
            });
          }}
        />
      </EuiFormRow>

      {formatState?.mode === 'custom' && (
        <EuiFormRow
          label={i18n.translate('xpack.lens.indexPattern.decimalPlacesLabel', {
            defaultMessage: 'Moment.js format',
          })}
          display="rowCompressed"
        >
          <EuiFieldText
            data-test-subj="indexPattern-dimension-formatDecimals"
            value={formatState.pattern || ''}
            min={0}
            max={20}
            onChange={(e) => {
              onChange({
                id: 'date',
                params: {
                  pattern: e.target.value,
                },
              });
            }}
            compressed
            fullWidth
          />
        </EuiFormRow>
      )}
    </>
  );
}
