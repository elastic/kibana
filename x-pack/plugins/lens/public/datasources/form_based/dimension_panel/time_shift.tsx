/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFormRow, EuiFlexItem, EuiFlexGroup } from '@elastic/eui';
import { EuiComboBox } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useEffect, useState } from 'react';
import { type DatatableUtilitiesService, parseTimeShift } from '@kbn/data-plugin/common';
import {
  adjustTimeScaleLabelSuffix,
  GenericIndexPatternColumn,
  operationDefinitionMap,
} from '../operations';
import type { FormBasedLayer } from '../types';
import type { FormBasedDimensionEditorProps } from './dimension_panel';
import {
  getDateHistogramInterval,
  getLayerTimeShiftChecks,
  timeShiftOptions,
  getColumnTimeShiftWarnings,
} from '../time_shift_utils';
import type { IndexPattern } from '../../../types';

export function setTimeShift(
  columnId: string,
  layer: FormBasedLayer,
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
        trimmedTimeShift,
        currentColumn.reducedTimeRange,
        currentColumn.reducedTimeRange
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
  datatableUtilities,
  selectedColumn,
  columnId,
  layer,
  updateLayer,
  indexPattern,
  activeData,
  layerId,
}: {
  datatableUtilities: DatatableUtilitiesService;
  selectedColumn: GenericIndexPatternColumn;
  indexPattern: IndexPattern;
  columnId: string;
  layer: FormBasedLayer;
  updateLayer: (newLayer: FormBasedLayer) => void;
  activeData: FormBasedDimensionEditorProps['activeData'];
  layerId: string;
}) {
  const [localValue, setLocalValue] = useState(selectedColumn.timeShift);
  useEffect(() => {
    setLocalValue(selectedColumn.timeShift);
  }, [selectedColumn.timeShift]);
  const selectedOperation = operationDefinitionMap[selectedColumn.operationType];
  if (!selectedOperation.shiftable) {
    return null;
  }

  const dateHistogramInterval = getDateHistogramInterval(
    datatableUtilities,
    layer,
    indexPattern,
    activeData,
    layerId
  );
  const { canShift, isValueTooSmall, isValueNotMultiple, isInvalid } =
    getLayerTimeShiftChecks(dateHistogramInterval);

  if (!canShift) {
    return null;
  }

  const parsedLocalValue = localValue && parseTimeShift(localValue);
  const isLocalValueInvalid = Boolean(parsedLocalValue && isInvalid(parsedLocalValue));
  const warnings = getColumnTimeShiftWarnings(dateHistogramInterval, localValue);

  function getSelectedOption() {
    const goodPick = timeShiftOptions.filter(({ value }) => value === localValue);
    if (goodPick.length > 0) return goodPick;
    return [
      {
        value: localValue ?? '',
        label:
          localValue ??
          i18n.translate('xpack.lens.timeShift.none', {
            defaultMessage: 'None',
          }),
      },
    ];
  }

  return (
    <div>
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
          warnings[0] ??
          (isLocalValueInvalid &&
            i18n.translate('xpack.lens.indexPattern.timeShift.genericInvalidHelp', {
              defaultMessage: 'Time shift value is not valid.',
            }))
        }
        isInvalid={Boolean(isLocalValueInvalid || warnings.length)}
      >
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem>
            <EuiComboBox
              fullWidth
              compressed
              isClearable={true}
              data-test-subj="indexPattern-dimension-time-shift"
              placeholder={i18n.translate('xpack.lens.indexPattern.timeShiftPlaceholder', {
                defaultMessage: 'Type custom values (e.g. 8w)',
              })}
              options={timeShiftOptions.filter(({ value }) => {
                const parsedValue = parseTimeShift(value);
                return (
                  parsedValue && !isValueTooSmall(parsedValue) && !isValueNotMultiple(parsedValue)
                );
              })}
              selectedOptions={getSelectedOption()}
              singleSelection={{ asPlainText: false }}
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
                if (choices.length === 0 || (choices.length && choices[0].value === '')) {
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
        </EuiFlexGroup>
      </EuiFormRow>
    </div>
  );
}
