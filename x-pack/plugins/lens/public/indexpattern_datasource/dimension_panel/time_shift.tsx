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
import React, { useEffect, useRef, useState } from 'react';
import { Query } from 'src/plugins/data/public';
import { parseTimeShift } from '../../../../../../src/plugins/data/common';
import {
  adjustTimeScaleLabelSuffix,
  GenericIndexPatternColumn,
  operationDefinitionMap,
} from '../operations';
import { IndexPattern, IndexPatternLayer } from '../types';
import { IndexPatternDimensionEditorProps } from './dimension_panel';
import {
  getDateHistogramInterval,
  getLayerTimeShiftChecks,
  timeShiftOptions,
} from '../time_shift_utils';

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
  const trimmedTimeShift = timeShift?.trim();
  const currentColumn = layer.columns[columnId];
  const label = currentColumn.customLabel
    ? currentColumn.label
    : adjustTimeScaleLabelSuffix(
        currentColumn.label,
        currentColumn.timeScale,
        currentColumn.timeScale,
        currentColumn.timeShift,
        trimmedTimeShift
      );
  return {
    ...layer,
    columns: {
      ...layer.columns,
      [columnId]: {
        ...layer.columns[columnId],
        label,
        timeShift: trimmedTimeShift,
      },
    },
  };
}

export function TimeShift({
  selectedColumn,
  columnId,
  layer,
  updateLayer,
  indexPattern,
  isFocused,
  activeData,
  layerId,
}: {
  selectedColumn: GenericIndexPatternColumn;
  indexPattern: IndexPattern;
  columnId: string;
  layer: IndexPatternLayer;
  updateLayer: (newLayer: IndexPatternLayer) => void;
  isFocused: boolean;
  activeData: IndexPatternDimensionEditorProps['activeData'];
  layerId: string;
}) {
  const focusSetRef = useRef(false);
  const [localValue, setLocalValue] = useState(selectedColumn.timeShift);
  useEffect(() => {
    setLocalValue(selectedColumn.timeShift);
  }, [selectedColumn.timeShift]);
  const selectedOperation = operationDefinitionMap[selectedColumn.operationType];
  if (!selectedOperation.shiftable || selectedColumn.timeShift === undefined) {
    return null;
  }

  const dateHistogramInterval = getDateHistogramInterval(layer, indexPattern, activeData, layerId);
  const { isValueTooSmall, isValueNotMultiple, isInvalid, canShift } =
    getLayerTimeShiftChecks(dateHistogramInterval);

  if (!canShift) {
    return null;
  }

  const parsedLocalValue = localValue && parseTimeShift(localValue);
  const isLocalValueInvalid = Boolean(parsedLocalValue && isInvalid(parsedLocalValue));
  const localValueTooSmall = parsedLocalValue && isValueTooSmall(parsedLocalValue);
  const localValueNotMultiple = parsedLocalValue && isValueNotMultiple(parsedLocalValue);

  function getSelectedOption() {
    if (!localValue) return [];
    const goodPick = timeShiftOptions.filter(({ value }) => value === localValue);
    if (goodPick.length > 0) return goodPick;
    return [
      {
        value: localValue,
        label: localValue,
      },
    ];
  }

  return (
    <div
      ref={(r) => {
        if (r && isFocused) {
          const timeShiftInput = r.querySelector('[data-test-subj="comboBoxSearchInput"]');
          if (!focusSetRef.current && timeShiftInput instanceof HTMLInputElement) {
            focusSetRef.current = true;
            timeShiftInput.focus();
          }
        }
      }}
    >
      <EuiFormRow
        display="rowCompressed"
        fullWidth
        data-test-subj="indexPattern-dimension-time-shift-row"
        label={i18n.translate('xpack.lens.indexPattern.timeShift.label', {
          defaultMessage: 'Time shift',
        })}
        helpText={i18n.translate('xpack.lens.indexPattern.timeShift.help', {
          defaultMessage: 'Enter the time shift number and unit',
        })}
        error={
          (localValueTooSmall &&
            i18n.translate('xpack.lens.indexPattern.timeShift.tooSmallHelp', {
              defaultMessage:
                'Time shift should to be larger than the date histogram interval. Either increase time shift or specify smaller interval in date histogram',
            })) ||
          (localValueNotMultiple &&
            i18n.translate('xpack.lens.indexPattern.timeShift.noMultipleHelp', {
              defaultMessage:
                'Time shift should be a multiple of the date histogram interval. Either adjust time shift or date histogram interval',
            })) ||
          (isLocalValueInvalid &&
            i18n.translate('xpack.lens.indexPattern.timeShift.genericInvalidHelp', {
              defaultMessage: 'Time shift value is not valid.',
            }))
        }
        isInvalid={Boolean(isLocalValueInvalid || localValueTooSmall || localValueNotMultiple)}
      >
        <EuiFlexGroup gutterSize="s" alignItems="center">
          <EuiFlexItem>
            <EuiComboBox
              fullWidth
              compressed
              isClearable={false}
              data-test-subj="indexPattern-dimension-time-shift"
              placeholder={i18n.translate('xpack.lens.indexPattern.timeShiftPlaceholder', {
                defaultMessage: 'Type custom values (e.g. 8w)',
              })}
              options={timeShiftOptions.filter(({ value }) => {
                const parsedValue = parseTimeShift(value);
                return (
                  parsedValue &&
                  !isValueTooSmall(parsedValue) &&
                  !isValueNotMultiple(parsedValue) &&
                  !(parsedValue === 'previous' && dateHistogramInterval.interval)
                );
              })}
              selectedOptions={getSelectedOption()}
              singleSelection={{ asPlainText: true }}
              isInvalid={isLocalValueInvalid}
              onCreateOption={(val) => {
                const parsedVal = parseTimeShift(val);
                if (!isInvalid(parsedVal)) {
                  updateLayer(setTimeShift(columnId, layer, val));
                } else {
                  setLocalValue(val);
                }
              }}
              onChange={(choices) => {
                if (choices.length === 0) {
                  updateLayer(setTimeShift(columnId, layer, ''));
                  setLocalValue('');
                  return;
                }

                const choice = choices[0].value as string;
                const parsedVal = parseTimeShift(choice);
                if (!isInvalid(parsedVal)) {
                  updateLayer(setTimeShift(columnId, layer, choice));
                } else {
                  setLocalValue(choice);
                }
              }}
            />
          </EuiFlexItem>
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
        </EuiFlexGroup>
      </EuiFormRow>
    </div>
  );
}
