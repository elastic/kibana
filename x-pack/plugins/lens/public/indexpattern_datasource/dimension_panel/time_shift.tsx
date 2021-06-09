/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonIcon } from '@elastic/eui';
import { EuiFormRow, EuiFlexItem, EuiFlexGroup } from '@elastic/eui';
import { EuiComboBox } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { uniq } from 'lodash';
import { i18n } from '@kbn/i18n';
import React, { useEffect, useRef, useState } from 'react';
import { Query } from 'src/plugins/data/public';
import { search } from '../../../../../../src/plugins/data/public';
import { parseTimeShift } from '../../../../../../src/plugins/data/common';
import {
  adjustTimeScaleLabelSuffix,
  IndexPatternColumn,
  operationDefinitionMap,
} from '../operations';
import { IndexPattern, IndexPatternLayer, IndexPatternPrivateState } from '../types';
import { IndexPatternDimensionEditorProps } from './dimension_panel';
import { FramePublicAPI } from '../../types';
import { Datatable } from '../../../../../../src/plugins/expressions';

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

export const timeShiftOptions = [
  {
    label: i18n.translate('xpack.lens.indexPattern.timeShift.hour', {
      defaultMessage: '1 hour (1h)',
    }),
    value: '1h',
  },
  {
    label: i18n.translate('xpack.lens.indexPattern.timeShift.3hours', {
      defaultMessage: '3 hours (3h)',
    }),
    value: '3h',
  },
  {
    label: i18n.translate('xpack.lens.indexPattern.timeShift.6hours', {
      defaultMessage: '6 hours (6h)',
    }),
    value: '6h',
  },
  {
    label: i18n.translate('xpack.lens.indexPattern.timeShift.12hours', {
      defaultMessage: '12 hours (12h)',
    }),
    value: '12h',
  },
  {
    label: i18n.translate('xpack.lens.indexPattern.timeShift.day', {
      defaultMessage: '1 day (1d)',
    }),
    value: '1d',
  },
  {
    label: i18n.translate('xpack.lens.indexPattern.timeShift.week', {
      defaultMessage: '1 week (1w)',
    }),
    value: '1w',
  },
  {
    label: i18n.translate('xpack.lens.indexPattern.timeShift.month', {
      defaultMessage: '1 month (1M)',
    }),
    value: '1M',
  },
  {
    label: i18n.translate('xpack.lens.indexPattern.timeShift.3months', {
      defaultMessage: '3 months (3M)',
    }),
    value: '3M',
  },
  {
    label: i18n.translate('xpack.lens.indexPattern.timeShift.6months', {
      defaultMessage: '6 months (6M)',
    }),
    value: '6M',
  },
  {
    label: i18n.translate('xpack.lens.indexPattern.timeShift.year', {
      defaultMessage: '1 year (1y)',
    }),
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
  activeData,
  layerId,
}: {
  selectedColumn: IndexPatternColumn;
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

  const { isValueTooSmall, isValueNotMultiple, canShift } = getLayerTimeShiftChecks(
    layer,
    indexPattern,
    activeData,
    layerId
  );

  if (!canShift) {
    return null;
  }

  const parsedLocalValue = localValue && parseTimeShift(localValue);
  const isLocalValueInvalid = Boolean(parsedLocalValue === 'invalid');
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
        display="columnCompressed"
        fullWidth
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
                defaultMessage: 'Time shift (e.g. 1d)',
              })}
              options={timeShiftOptions.filter(({ value }) => {
                const parsedValue = parseTimeShift(value);
                return (
                  parsedValue && !isValueTooSmall(parsedValue) && !isValueNotMultiple(parsedValue)
                );
              })}
              selectedOptions={getSelectedOption()}
              singleSelection={{ asPlainText: true }}
              isInvalid={isLocalValueInvalid}
              onCreateOption={(val) => {
                const parsedVal = parseTimeShift(val);
                if (parsedVal !== 'invalid') {
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
                if (parsedVal !== 'invalid') {
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

export function getDateHistogramInterval(
  layer: IndexPatternLayer,
  indexPattern: IndexPattern,
  activeData: Record<string, Datatable> | undefined,
  layerId: string
) {
  const dateHistogramColumn = layer.columnOrder.find(
    (colId) => layer.columns[colId].operationType === 'date_histogram'
  );
  if (!dateHistogramColumn && !indexPattern.timeFieldName) {
    return { canShift: false };
  }
  if (dateHistogramColumn && activeData && activeData[layerId] && activeData[layerId]) {
    const column = activeData[layerId].columns.find((col) => col.id === dateHistogramColumn);
    if (column) {
      const expression =
        search.aggs.getDateHistogramMetaDataByDatatableColumn(column)?.interval || '';
      return {
        interval: search.aggs.parseInterval(expression),
        expression,
        canShift: true,
      };
    }
  }
  return { canShift: true };
}

export function getLayerTimeShiftChecks(
  layer: IndexPatternLayer,
  indexPattern: IndexPattern,
  activeData: Record<string, Datatable> | undefined,
  layerId: string
) {
  const { interval: dateHistogramInterval, canShift } = getDateHistogramInterval(
    layer,
    indexPattern,
    activeData,
    layerId
  );

  return {
    canShift,
    isValueTooSmall: (parsedValue: ReturnType<typeof parseTimeShift>) => {
      return (
        dateHistogramInterval &&
        parsedValue &&
        typeof parsedValue === 'object' &&
        parsedValue.asMilliseconds() < dateHistogramInterval.asMilliseconds()
      );
    },
    isValueNotMultiple: (parsedValue: ReturnType<typeof parseTimeShift>) => {
      return (
        dateHistogramInterval &&
        parsedValue &&
        typeof parsedValue === 'object' &&
        !Number.isInteger(parsedValue.asMilliseconds() / dateHistogramInterval.asMilliseconds())
      );
    },
  };
}

export function getStateTimeShiftWarningMessages(
  state: IndexPatternPrivateState,
  { activeData }: FramePublicAPI
) {
  if (!state) return;
  const warningMessages: React.ReactNode[] = [];
  Object.entries(state.layers).forEach(([layerId, layer]) => {
    const dateHistogramInterval = getDateHistogramInterval(
      layer,
      state.indexPatterns[layer.indexPatternId],
      activeData,
      layerId
    );
    if (!dateHistogramInterval.interval) {
      return;
    }
    const dateHistogramIntervalExpression = dateHistogramInterval.expression;
    const shiftInterval = dateHistogramInterval.interval.asMilliseconds();
    let timeShifts: number[] = [];
    const timeShiftMap: Record<number, string[]> = {};
    Object.entries(layer.columns).forEach(([columnId, column]) => {
      if (column.isBucketed) return;
      let duration: number = 0;
      if (column.timeShift) {
        const parsedTimeShift = parseTimeShift(column.timeShift);
        if (parsedTimeShift === 'previous' || parsedTimeShift === 'invalid') {
          return;
        }
        duration = parsedTimeShift.asMilliseconds();
      }
      timeShifts.push(duration);
      if (!timeShiftMap[duration]) {
        timeShiftMap[duration] = [];
      }
      timeShiftMap[duration].push(columnId);
    });
    timeShifts = uniq(timeShifts);

    if (timeShifts.length < 2) {
      return;
    }

    timeShifts.forEach((timeShift) => {
      if (timeShift === 0) return;
      if (timeShift < shiftInterval) {
        timeShiftMap[timeShift].forEach((columnId) => {
          warningMessages.push(
            <FormattedMessage
              key={`small-${columnId}`}
              id="xpack.lens.indexPattern.timeShiftSmallWarning"
              defaultMessage="{label} uses a time shift of {columnTimeShift} which is smaller than the date histogram interval of {interval}. To prevent mismatched data, use a multiple of {interval} as time shift."
              values={{
                label: <strong>{layer.columns[columnId].label}</strong>,
                interval: <strong>{dateHistogramIntervalExpression}</strong>,
                columnTimeShift: <strong>{layer.columns[columnId].timeShift}</strong>,
              }}
            />
          );
        });
      } else if (!Number.isInteger(timeShift / shiftInterval)) {
        timeShiftMap[timeShift].forEach((columnId) => {
          warningMessages.push(
            <FormattedMessage
              key={`multiple-${columnId}`}
              id="xpack.lens.indexPattern.timeShiftMultipleWarning"
              defaultMessage="{label} uses a time shift of {columnTimeShift} which is not a multiple of the date histogram interval of {interval}. To prevent mismatched data, use a multiple of {interval} as time shift."
              values={{
                label: <strong>{layer.columns[columnId].label}</strong>,
                interval: dateHistogramIntervalExpression,
                columnTimeShift: layer.columns[columnId].timeShift!,
              }}
            />
          );
        });
      }
    });
  });
  return warningMessages;
}

export function getColumnTimeShiftWarnings(
  layer: IndexPatternLayer,
  indexPattern: IndexPattern,
  activeData: Record<string, Datatable> | undefined,
  layerId: string,
  column: IndexPatternColumn
) {
  const { isValueTooSmall, isValueNotMultiple } = getLayerTimeShiftChecks(
    layer,
    indexPattern,
    activeData,
    layerId
  );

  const warnings: string[] = [];

  const parsedLocalValue = column.timeShift && parseTimeShift(column.timeShift);
  const localValueTooSmall = parsedLocalValue && isValueTooSmall(parsedLocalValue);
  if (localValueTooSmall) {
    warnings.push(
      i18n.translate('xpack.lens.indexPattern.timeShift.tooSmallHelp', {
        defaultMessage:
          'Time shift should to be larger than the date histogram interval. Either increase time shift or specify smaller interval in date histogram',
      })
    );
  }
  const localValueNotMultiple = parsedLocalValue && isValueNotMultiple(parsedLocalValue);
  if (localValueNotMultiple) {
    warnings.push(
      i18n.translate('xpack.lens.indexPattern.timeShift.noMultipleHelp', {
        defaultMessage:
          'Time shift should be a multiple of the date histogram interval. Either adjust time shift or date histogram interval',
      })
    );
  }
  return warnings;
}
