/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFormRow, EuiFieldNumber, EuiComboBox } from '@elastic/eui';
import { IndexPatternColumn } from '../indexpattern';

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

interface FormatSelectorProps {
  selectedColumn: IndexPatternColumn;
  onChange: (newFormat?: { id: string; params?: Record<string, unknown> }) => void;
}

interface State {
  decimalPlaces: number;
}

export function FormatSelector(props: FormatSelectorProps) {
  const { selectedColumn, onChange } = props;

  const currentFormat =
    'params' in selectedColumn && selectedColumn.params && 'format' in selectedColumn.params
      ? selectedColumn.params.format
      : undefined;
  const [state, setState] = useState<State>({
    decimalPlaces:
      typeof currentFormat?.params?.decimals === 'number' ? currentFormat.params.decimals : 2,
  });

  const selectedFormat = currentFormat?.id ? supportedFormats[currentFormat.id] : undefined;

  const defaultOption = {
    value: '',
    label: i18n.translate('xpack.lens.indexPattern.defaultFormatLabel', {
      defaultMessage: 'Default',
    }),
  };

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
          options={[
            defaultOption,
            ...Object.entries(supportedFormats).map(([id, format]) => ({
              value: id,
              label: format.title ?? id,
            })),
          ]}
          selectedOptions={
            currentFormat
              ? [
                  {
                    value: currentFormat.id,
                    label: selectedFormat?.title ?? currentFormat.id,
                  },
                ]
              : [defaultOption]
          }
          onChange={(choices) => {
            if (choices.length === 0) {
              return;
            }

            if (!choices[0].value) {
              onChange();
              return;
            }
            onChange({
              id: choices[0].value,
              params: { decimals: state.decimalPlaces },
            });
          }}
        />
      </EuiFormRow>

      {currentFormat ? (
        <EuiFormRow
          label={i18n.translate('xpack.lens.indexPattern.decimalPlacesLabel', {
            defaultMessage: 'Decimals',
          })}
          display="rowCompressed"
        >
          <EuiFieldNumber
            data-test-subj="indexPattern-dimension-formatDecimals"
            value={state.decimalPlaces}
            min={0}
            max={20}
            onChange={(e) => {
              setState({ decimalPlaces: Number(e.target.value) });
              onChange({
                id: (selectedColumn.params as { format: { id: string } }).format.id,
                params: {
                  decimals: Number(e.target.value),
                },
              });
            }}
            compressed
            fullWidth
          />
        </EuiFormRow>
      ) : null}
    </>
  );
}
