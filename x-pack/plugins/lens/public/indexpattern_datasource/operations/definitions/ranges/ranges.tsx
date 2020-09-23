/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';

import { UI_SETTINGS } from '../../../../../../../../src/plugins/data/common';
import { Range } from '../../../../../../../../src/plugins/expressions/common/expression_types/index';
import { RangeEditor } from './range_editor';
import { OperationDefinition } from '../index';
import { FieldBasedIndexPatternColumn } from '../column_types';
import { updateColumnParam, changeColumn } from '../../../state_helpers';
import { MODES, AUTO_BARS, DEFAULT_INTERVAL, MIN_HISTOGRAM_BARS, SLICES } from './constants';

type RangeType = Omit<Range, 'type'>;
export type RangeTypeLens = RangeType & { label: string };

export type MODES_TYPES = typeof MODES[keyof typeof MODES];

export interface RangeIndexPatternColumn extends FieldBasedIndexPatternColumn {
  operationType: 'range';
  params: {
    type: MODES_TYPES;
    maxBars: typeof AUTO_BARS | number;
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
  if (isFullRange(range)) {
    return isRangeWithin(range);
  }
  return true;
};

function getEsAggsParams({ sourceField, params }: RangeIndexPatternColumn) {
  if (params.type === MODES.Range) {
    return {
      field: sourceField,
      ranges: params.ranges.filter(isValidRange).map<Partial<RangeType>>((range) => {
        if (isFullRange(range)) {
          return { from: range.from, to: range.to };
        }
        const partialRange: Partial<RangeType> = {};
        // be careful with the fields to set on partial ranges
        if (isValidNumber(range.from)) {
          partialRange.from = range.from;
        }
        if (isValidNumber(range.to)) {
          partialRange.to = range.to;
        }
        return partialRange;
      }),
    };
  }
  return {
    field: sourceField,
    // fallback to 0 in case of empty string
    maxBars: params.maxBars === AUTO_BARS ? null : params.maxBars,
    has_extended_bounds: false,
    min_doc_count: 0,
    extended_bounds: { min: '', max: '' },
  };
}

export const rangeOperation: OperationDefinition<RangeIndexPatternColumn> = {
  type: 'range',
  displayName: i18n.translate('xpack.lens.indexPattern.ranges', {
    defaultMessage: 'Ranges',
  }),
  priority: 4, // Higher than terms, so numbers get histogram
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
        ranges: [{ from: 0, to: DEFAULT_INTERVAL, label: '' }],
        maxBars: AUTO_BARS,
      },
    };
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
    const MAX_HISTOGRAM_BARS = uiSettings.get(UI_SETTINGS.HISTOGRAM_MAX_BARS);
    const granularityStep = (MAX_HISTOGRAM_BARS - MIN_HISTOGRAM_BARS) / SLICES;
    const maxBarsDefaultValue = (MAX_HISTOGRAM_BARS - MIN_HISTOGRAM_BARS) / 2;

    // Used to change one param at the time
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

    // Useful to change more params at once
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
            params: {
              type: newMode,
              ranges: [{ from: 0, to: DEFAULT_INTERVAL, label: '' }],
              maxBars: maxBarsDefaultValue,
            },
          },
          keepParams: false,
        })
      );
    };
    return (
      <RangeEditor
        setParam={setParam}
        maxBars={
          currentColumn.params.maxBars === AUTO_BARS
            ? maxBarsDefaultValue
            : currentColumn.params.maxBars
        }
        granularityStep={granularityStep}
        params={currentColumn.params}
        onChangeMode={onChangeMode}
        maxHistogramBars={uiSettings.get(UI_SETTINGS.HISTOGRAM_MAX_BARS)}
        rangeFormatter={rangeFormatter}
      />
    );
  },
};
