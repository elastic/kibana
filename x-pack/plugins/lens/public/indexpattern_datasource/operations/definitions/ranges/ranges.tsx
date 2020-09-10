/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiForm } from '@elastic/eui';

import {
  autoInterval,
  RangeType,
  UI_SETTINGS,
} from '../../../../../../../../src/plugins/data/common';
import { RangeEditor } from './range_editor';
import { OperationDefinition } from '../index';
import { FieldBasedIndexPatternColumn } from '../column_types';
import { updateColumnParam, changeColumn } from '../../../state_helpers';

export const DEFAULT_INTERVAL = 1000;
export const AUTO_BARS = 'auto';

export const MODES = {
  Range: 'range',
  Histogram: 'histogram',
} as const;

export type RangeTypeLens = RangeType & { label: string };

export type MODES_TYPES = typeof MODES.Range | typeof MODES.Histogram;

export interface RangeIndexPatternColumn extends FieldBasedIndexPatternColumn {
  operationType: 'range';
  params: {
    type: MODES_TYPES;
    interval: 'auto' | '' | number;
    maxBars: 'auto' | number;
    ranges: RangeTypeLens[];
  };
}

export type RangeColumnParams = RangeIndexPatternColumn['params'];
export type UpdateParamsFnType = <K extends keyof RangeColumnParams>(
  paramName: K,
  value: RangeColumnParams[K]
) => void;

export const isValidNumber = (value: number | '') =>
  value !== '' && !isNaN(value) && isFinite(value);
export const isRangeWithin = (range: RangeTypeLens): boolean => range.from <= range.to;
const isFullRange = ({ from, to }: RangeType) => isValidNumber(from) && isValidNumber(to);
export const isValidRange = (range: RangeTypeLens): boolean => {
  const { from, to } = range;
  if (isFullRange(range)) {
    return isRangeWithin(range);
  }
  return isValidNumber(from) || isValidNumber(to);
};

function getEsAggsParams({ sourceField, params }: RangeIndexPatternColumn) {
  if (params.type === MODES.Range) {
    return {
      field: sourceField,
      ranges: params.ranges.filter(isValidRange).map<Partial<RangeType>>((range) => {
        if (isFullRange(range)) {
          return { from: range.from, to: range.to };
        }
        // create a copy with only the valid numeric range prop
        const prop = isValidNumber(range.from) ? 'from' : 'to';
        const value = isValidNumber(range.from) ? range.from : range.to;
        return { [prop]: value };
      }),
    };
  }
  return {
    field: sourceField,
    // fallback to 0 in case of empty string
    interval: params.interval === '' ? 0 : params.interval,
    maxBars: params.maxBars === AUTO_BARS ? null : params.maxBars,
    has_extended_bounds: false,
    min_doc_count: false,
    extended_bounds: { min: '', max: '' },
  };
}

export const rangeOperation: OperationDefinition<RangeIndexPatternColumn> = {
  type: 'range',
  displayName: i18n.translate('xpack.lens.indexPattern.ranges', {
    defaultMessage: 'Ranges',
  }),
  priority: 3, // Higher than any metric
  getPossibleOperationForField: ({ aggregationRestrictions, aggregatable, type }) => {
    if (
      type === 'number' &&
      aggregatable &&
      (!aggregationRestrictions || aggregationRestrictions.range)
    ) {
      return {
        dataType: 'number',
        isBucketed: true,
        scale: 'interval',
      };
    }
  },
  buildColumn({ suggestedPriority, field }) {
    return {
      label: field.name,
      dataType: 'number', // string for Range
      operationType: 'range',
      suggestedPriority,
      sourceField: field.name,
      isBucketed: true,
      scale: 'interval', // ordinal for Range
      params: {
        type: MODES.Histogram,
        interval: autoInterval,
        ranges: [{ from: 0, to: DEFAULT_INTERVAL, label: '' }],
        maxBars: 'auto',
      },
    };
  },
  onOtherColumnChanged: (currentColumn, columns) => {
    return currentColumn;
  },
  isTransferable: (column, newIndexPattern) => {
    const newField = newIndexPattern.fields.find((field) => field.name === column.sourceField);

    return Boolean(
      newField &&
        newField.type === 'number' &&
        newField.aggregatable &&
        (!newField.aggregationRestrictions || newField.aggregationRestrictions.range)
    );
  },
  transfer: (column, newIndexPattern) => {
    return column;
  },
  onFieldChange: (oldColumn, indexPattern, field) => {
    return {
      ...oldColumn,
      label: field.name,
      sourceField: field.name,
    };
  },
  toEsAggsConfig: (column, columnId) => {
    const params = getEsAggsParams(column);
    return {
      id: columnId,
      enabled: true,
      type: column.params.type,
      schema: 'segment',
      params,
    };
  },
  paramEditor: ({ state, setState, currentColumn, layerId, columnId, uiSettings, data }) => {
    const rangeFormatter = data.fieldFormats.deserialize({ id: 'range' });
    const setParam: UpdateParamsFnType = (paramName, value) => {
      setState(
        updateColumnParam({
          state,
          layerId,
          currentColumn,
          paramName,
          value,
        })
      );
    };

    const onChangeMode = (newMode: MODES_TYPES) => {
      const scale = newMode === MODES.Range ? 'ordinal' : 'interval';
      const dataType = newMode === MODES.Range ? 'string' : 'number';
      setState(
        changeColumn({
          state,
          layerId,
          columnId,
          newColumn: {
            ...currentColumn,
            scale,
            dataType,
            params: { ...currentColumn.params, type: newMode },
          },
          keepParams: false,
        })
      );
    };
    return (
      <EuiForm>
        <RangeEditor
          onAutoIntervalToggle={(enabled: boolean) =>
            setParam('interval', enabled ? autoInterval : '')
          }
          setParam={setParam}
          params={currentColumn.params}
          onChangeMode={onChangeMode}
          maxHistogramBars={uiSettings.get(UI_SETTINGS.HISTOGRAM_MAX_BARS)}
          rangeFormatter={rangeFormatter}
        />
      </EuiForm>
    );
  },
};
