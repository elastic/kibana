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

import { parseTimeShift } from '@kbn/data-plugin/common';
import { Duration } from 'moment';
import {
  adjustTimeScaleLabelSuffix,
  GenericIndexPatternColumn,
  operationDefinitionMap,
} from '../operations';
import type { IndexPatternLayer } from '../types';
import type { IndexPattern } from '../../types';
import { reducedTimeRangeOptions } from '../reduced_time_range_utils';

export function setReducedTimeRange(
  columnId: string,
  layer: IndexPatternLayer,
  reducedTimeRange: string | undefined
) {
  const trimmedReducedTimeRange = reducedTimeRange?.trim();
  const currentColumn = layer.columns[columnId];
  const label = currentColumn.customLabel
    ? currentColumn.label
    : adjustTimeScaleLabelSuffix(
        currentColumn.label,
        currentColumn.timeScale,
        currentColumn.timeScale,
        currentColumn.timeShift,
        currentColumn.timeShift,
        currentColumn.reducedTimeRange,
        trimmedReducedTimeRange
      );
  return {
    ...layer,
    columns: {
      ...layer.columns,
      [columnId]: {
        ...layer.columns[columnId],
        reducedTimeRange: trimmedReducedTimeRange,
        label,
      },
    },
  };
}

function isInvalid(value: Duration | 'previous' | 'invalid') {
  return value === 'previous' || value === 'invalid';
}

export function ReducedTimeRange({
  selectedColumn,
  columnId,
  layer,
  updateLayer,
  indexPattern,
}: {
  selectedColumn: GenericIndexPatternColumn;
  columnId: string;
  layer: IndexPatternLayer;
  updateLayer: (newLayer: IndexPatternLayer) => void;
  indexPattern: IndexPattern;
}) {
  const [localValue, setLocalValue] = useState(selectedColumn.reducedTimeRange);
  useEffect(() => {
    setLocalValue(selectedColumn.reducedTimeRange);
  }, [selectedColumn.reducedTimeRange]);
  const selectedOperation = operationDefinitionMap[selectedColumn.operationType];
  const hasDateHistogram = Object.values(layer.columns).some(
    (c) => c.operationType === 'date_histogram'
  );
  if (
    !selectedOperation.canReduceTimeRange ||
    (!selectedColumn.reducedTimeRange && (hasDateHistogram || !indexPattern.timeFieldName))
  ) {
    return null;
  }

  const parsedLocalValue = localValue && parseTimeShift(localValue);
  const isLocalValueInvalid = Boolean(parsedLocalValue && isInvalid(parsedLocalValue));
  const shouldNotUseReducedTimeRange = Boolean(hasDateHistogram || !indexPattern.timeFieldName);

  function getSelectedOption() {
    if (!localValue) return [];
    const goodPick = reducedTimeRangeOptions.filter(({ value }) => value === localValue);
    if (goodPick.length > 0) return goodPick;
    return [
      {
        value: localValue,
        label: localValue,
      },
    ];
  }

  return (
    <div>
      <EuiFormRow
        display="rowCompressed"
        fullWidth
        data-test-subj="indexPattern-dimension-reducedTimeRange-row"
        label={i18n.translate('xpack.lens.indexPattern.reducedTimeRange.label', {
          defaultMessage: 'Reduced time range',
        })}
        helpText={i18n.translate('xpack.lens.indexPattern.reducedTimeRange.help', {
          defaultMessage:
            'Reduces the time range specified in the global time filter from the end of the global time filter.',
        })}
        error={
          shouldNotUseReducedTimeRange
            ? i18n.translate('xpack.lens.indexPattern.reducedTimeRange.notApplicableHelp', {
                defaultMessage:
                  'Additional time range filter can not be used together with date histogram or without a default time field specified on the data view',
              })
            : isLocalValueInvalid
            ? i18n.translate('xpack.lens.indexPattern.reducedTimeRange.genericInvalidHelp', {
                defaultMessage: 'Time range value is not valid.',
              })
            : undefined
        }
        isInvalid={isLocalValueInvalid || shouldNotUseReducedTimeRange}
      >
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem>
            <EuiComboBox
              fullWidth
              compressed
              isClearable={true}
              data-test-subj="indexPattern-dimension-reducedTimeRange"
              placeholder={i18n.translate('xpack.lens.indexPattern.reducedTimeRangePlaceholder', {
                defaultMessage: 'Type custom values (e.g. 12m)',
              })}
              options={reducedTimeRangeOptions}
              selectedOptions={getSelectedOption()}
              singleSelection={{ asPlainText: true }}
              isInvalid={isLocalValueInvalid}
              onCreateOption={(val) => {
                const parsedVal = parseTimeShift(val);
                if (!isInvalid(parsedVal)) {
                  updateLayer(setReducedTimeRange(columnId, layer, val));
                } else {
                  setLocalValue(val);
                }
              }}
              onChange={(choices) => {
                if (choices.length === 0) {
                  updateLayer(setReducedTimeRange(columnId, layer, ''));
                  setLocalValue('');
                  return;
                }

                const choice = choices[0].value as string;
                const parsedVal = parseTimeShift(choice);
                if (!isInvalid(parsedVal)) {
                  updateLayer(setReducedTimeRange(columnId, layer, choice));
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
