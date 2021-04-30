/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonIcon } from '@elastic/eui';
import { EuiFormRow, EuiFlexItem, EuiFlexGroup } from '@elastic/eui';
import { EuiComboBox } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { Query } from 'src/plugins/data/public';
import { IndexPatternColumn, operationDefinitionMap } from '../operations';
import { IndexPattern, IndexPatternLayer } from '../types';

// to do: get the language from uiSettings
export const defaultFilter: Query = {
  query: '',
  language: 'kuery',
};

export function setTimeShift(
  columnId: string,
  layer: IndexPatternLayer,
  timeShift: string | undefined
) {
  return {
    ...layer,
    columns: {
      ...layer.columns,
      [columnId]: {
        ...layer.columns[columnId],
        timeShift,
      },
    },
  };
}

const timeShiftOptions = [
  {
    label: i18n.translate('xpack.lens.indexPattern.timeShift.hour', { defaultMessage: '1 hour' }),
    value: '1h',
  },
  {
    label: i18n.translate('xpack.lens.indexPattern.timeShift.3hours', {
      defaultMessage: '3 hours',
    }),
    value: '3h',
  },
  {
    label: i18n.translate('xpack.lens.indexPattern.timeShift.6hours', {
      defaultMessage: '6 hours',
    }),
    value: '6h',
  },
  {
    label: i18n.translate('xpack.lens.indexPattern.timeShift.12hours', {
      defaultMessage: '12 hours',
    }),
    value: '12h',
  },
  {
    label: i18n.translate('xpack.lens.indexPattern.timeShift.day', { defaultMessage: '1 day' }),
    value: '1d',
  },
  {
    label: i18n.translate('xpack.lens.indexPattern.timeShift.week', { defaultMessage: '1 week' }),
    value: '1w',
  },
  {
    label: i18n.translate('xpack.lens.indexPattern.timeShift.month', { defaultMessage: '1 month' }),
    value: '1M',
  },
  {
    label: i18n.translate('xpack.lens.indexPattern.timeShift.3months', {
      defaultMessage: '3 months',
    }),
    value: '3M',
  },
  {
    label: i18n.translate('xpack.lens.indexPattern.timeShift.6months', {
      defaultMessage: '6 months',
    }),
    value: '6M',
  },
  {
    label: i18n.translate('xpack.lens.indexPattern.timeShift.year', { defaultMessage: '1 year' }),
    value: '1y',
  },
  {
    label: i18n.translate('xpack.lens.indexPattern.timeShift.previous', {
      defaultMessage: 'Previous',
    }),
    value: 'previous',
  },
];

export function TimeShift({
  selectedColumn,
  columnId,
  layer,
  updateLayer,
  indexPattern,
  isFocused,
}: {
  selectedColumn: IndexPatternColumn;
  indexPattern: IndexPattern;
  columnId: string;
  layer: IndexPatternLayer;
  updateLayer: (newLayer: IndexPatternLayer) => void;
  isFocused: boolean;
}) {
  const selectedOperation = operationDefinitionMap[selectedColumn.operationType];
  if (!selectedOperation.shiftable || selectedColumn.timeShift === undefined) {
    return null;
  }

  const timeShift = selectedColumn.timeShift;

  function getSelectedOption() {
    if (timeShift === '') return [];
    const goodPick = timeShiftOptions.filter(({ value }) => value === timeShift);
    if (goodPick.length > 0) return goodPick;
    return [
      {
        value: timeShift,
        label: timeShift,
      },
    ];
  }

  return (
    <div
      ref={(r) => {
        if (r && isFocused) {
          const timeShiftInput = r.querySelector('[data-test-subj="comboBoxSearchInput"]');
          if (timeShiftInput instanceof HTMLInputElement) {
            timeShiftInput.focus();
          }
        }
      }}
    >
      <EuiFormRow
        display="columnCompressed"
        fullWidth
        label={i18n.translate('xpack.lens.indexPattern.timeShift.label', {
          defaultMessage: 'Time shift',
        })}
      >
        <EuiFlexGroup gutterSize="s" alignItems="center">
          <EuiFlexItem>
            <EuiComboBox
              fullWidth
              compressed
              isClearable={false}
              data-test-subj="indexPattern-dimension-time-shift"
              placeholder={i18n.translate('xpack.lens.indexPattern.timeShiftPlaceholder', {
                defaultMessage: 'Time shift (e.g. 1d)',
              })}
              options={timeShiftOptions}
              selectedOptions={getSelectedOption()}
              singleSelection={{ asPlainText: true }}
              onCreateOption={(val) => {
                updateLayer(setTimeShift(columnId, layer, val));
              }}
              onChange={(choices) => {
                if (choices.length === 0) {
                  updateLayer(setTimeShift(columnId, layer, ''));
                  return;
                }

                const choice = choices[0].value as string;
                updateLayer(setTimeShift(columnId, layer, choice));
              }}
            />
          </EuiFlexItem>
          {selectedOperation.timeScalingMode === 'optional' && (
            <EuiFlexItem grow={false}>
              <EuiButtonIcon
                data-test-subj="indexPattern-time-shift-remove"
                color="danger"
                aria-label={i18n.translate('xpack.lens.timeShift.removeLabel', {
                  defaultMessage: 'Remove time shift',
                })}
                onClick={() => {
                  updateLayer(setTimeShift(columnId, layer, undefined));
                }}
                iconType="cross"
              />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiFormRow>
    </div>
  );
}
