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
import { IndexPattern, IndexPatternLayer } from '../types';
import { windowOptions } from '../window_utils';

export function setWindow(columnId: string, layer: IndexPatternLayer, window: string | undefined) {
  const trimmedWindow = window?.trim();
  const currentColumn = layer.columns[columnId];
  const label = currentColumn.customLabel
    ? currentColumn.label
    : adjustTimeScaleLabelSuffix(
        currentColumn.label,
        currentColumn.timeScale,
        currentColumn.timeScale,
        currentColumn.timeShift,
        currentColumn.timeShift,
        currentColumn.window,
        trimmedWindow
      );
  return {
    ...layer,
    columns: {
      ...layer.columns,
      [columnId]: {
        ...layer.columns[columnId],
        window: trimmedWindow,
        label,
      },
    },
  };
}

function isInvalid(value: Duration | 'previous' | 'invalid') {
  return value === 'previous' || value === 'invalid';
}

export function Window({
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
  const [localValue, setLocalValue] = useState(selectedColumn.window);
  useEffect(() => {
    setLocalValue(selectedColumn.window);
  }, [selectedColumn.window]);
  const selectedOperation = operationDefinitionMap[selectedColumn.operationType];
  const hasDateHistogram = Object.values(layer.columns).some(
    (c) => c.operationType === 'date_histogram'
  );
  if (
    !selectedOperation.windowable ||
    (!selectedColumn.window && (hasDateHistogram || !indexPattern.timeFieldName))
  ) {
    return null;
  }

  const parsedLocalValue = localValue && parseTimeShift(localValue);
  const isLocalValueInvalid = Boolean(parsedLocalValue && isInvalid(parsedLocalValue));
  const shouldNotUseWindow = Boolean(hasDateHistogram || !indexPattern.timeFieldName);

  function getSelectedOption() {
    if (!localValue) return [];
    const goodPick = windowOptions.filter(({ value }) => value === localValue);
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
        data-test-subj="indexPattern-dimension-window-row"
        label={i18n.translate('xpack.lens.indexPattern.window.label', {
          defaultMessage: 'Reduced time range',
        })}
        helpText={i18n.translate('xpack.lens.indexPattern.window.help', {
          defaultMessage:
            'Reduces the time range specified in the global time filter from the end of the global time filter.',
        })}
        error={
          shouldNotUseWindow
            ? i18n.translate('xpack.lens.indexPattern.window.notApplicableHelp', {
                defaultMessage:
                  'Additional time range filter can not be used together with date histogram or without a default time field specified on the data view',
              })
            : isLocalValueInvalid
            ? i18n.translate('xpack.lens.indexPattern.window.genericInvalidHelp', {
                defaultMessage: 'Time range value is not valid.',
              })
            : undefined
        }
        isInvalid={isLocalValueInvalid || shouldNotUseWindow}
      >
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem>
            <EuiComboBox
              fullWidth
              compressed
              isClearable={true}
              data-test-subj="indexPattern-dimension-window"
              placeholder={i18n.translate('xpack.lens.indexPattern.windowPlaceholder', {
                defaultMessage: 'Type custom values (e.g. 12m)',
              })}
              options={windowOptions}
              selectedOptions={getSelectedOption()}
              singleSelection={{ asPlainText: true }}
              isInvalid={isLocalValueInvalid}
              onCreateOption={(val) => {
                const parsedVal = parseTimeShift(val);
                if (!isInvalid(parsedVal)) {
                  updateLayer(setWindow(columnId, layer, val));
                } else {
                  setLocalValue(val);
                }
              }}
              onChange={(choices) => {
                if (choices.length === 0) {
                  updateLayer(setWindow(columnId, layer, ''));
                  setLocalValue('');
                  return;
                }

                const choice = choices[0].value as string;
                const parsedVal = parseTimeShift(choice);
                if (!isInvalid(parsedVal)) {
                  updateLayer(setWindow(columnId, layer, choice));
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
