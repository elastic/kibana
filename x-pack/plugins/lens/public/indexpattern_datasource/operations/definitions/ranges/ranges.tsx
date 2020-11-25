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
import { updateColumnParam } from '../../layer_helpers';
import { mergeLayer } from '../../../state_helpers';
import { supportedFormats } from '../../../format_column';
import { MODES, AUTO_BARS, DEFAULT_INTERVAL, MIN_HISTOGRAM_BARS, SLICES } from './constants';
import { IndexPattern, IndexPatternField } from '../../../types';

type RangeType = Omit<Range, 'type'>;
// Try to cover all possible serialized states for ranges
export type RangeTypeLens = (RangeType | { from: Range['from'] | null; to: Range['to'] | null }) & {
  label: string;
};

// This is a subset of RangeTypeLens which has both from and to defined
type FullRangeTypeLens = Extract<RangeTypeLens, NonNullable<RangeType>>;

export type MODES_TYPES = typeof MODES[keyof typeof MODES];

export interface RangeIndexPatternColumn extends FieldBasedIndexPatternColumn {
  operationType: 'range';
  params: {
    type: MODES_TYPES;
    maxBars: typeof AUTO_BARS | number;
    ranges: RangeTypeLens[];
    format?: { id: string; params?: { decimals: number } };
    parentFormat?: {
      id: string;
      params?: { id?: string; template?: string; replaceInfinity?: boolean };
    };
  };
}

export type RangeColumnParams = RangeIndexPatternColumn['params'];
export type UpdateParamsFnType = <K extends keyof RangeColumnParams>(
  paramName: K,
  value: RangeColumnParams[K]
) => void;

// on initialization values can be null (from the Infinity serialization), so handle it correctly
// or they will be casted to 0 by the editor ( see #78867 )
export const isValidNumber = (value: number | '' | null): value is number =>
  value != null && value !== '' && !isNaN(value) && isFinite(value);
export const isRangeWithin = (range: RangeType): boolean => range.from <= range.to;
const isFullRange = (range: RangeTypeLens): range is FullRangeTypeLens =>
  isValidNumber(range.from) && isValidNumber(range.to);
export const isValidRange = (range: RangeTypeLens): boolean => {
  if (isFullRange(range)) {
    return isRangeWithin(range);
  }
  return true;
};

function getFieldDefaultFormat(indexPattern: IndexPattern, field: IndexPatternField | undefined) {
  if (field) {
    if (indexPattern.fieldFormatMap && indexPattern.fieldFormatMap[field.name]) {
      return indexPattern.fieldFormatMap[field.name];
    }
  }
  return undefined;
}

function getEsAggsParams({ sourceField, params }: RangeIndexPatternColumn) {
  if (params.type === MODES.Range) {
    return {
      field: sourceField,
      ranges: params.ranges.filter(isValidRange).map<Partial<RangeType>>((range) => {
        if (isFullRange(range)) {
          return range;
        }
        const partialRange: Partial<RangeType> = { label: range.label };
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

export const rangeOperation: OperationDefinition<RangeIndexPatternColumn, 'field'> = {
  type: 'range',
  displayName: i18n.translate('xpack.lens.indexPattern.intervals', {
    defaultMessage: 'Intervals',
  }),
  priority: 4, // Higher than terms, so numbers get histogram
  input: 'field',
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
  getDefaultLabel: (column, indexPattern) =>
    indexPattern.getFieldByName(column.sourceField)!.displayName,
  buildColumn({ field }) {
    return {
      label: field.displayName,
      dataType: 'number', // string for Range
      operationType: 'range',
      sourceField: field.name,
      isBucketed: true,
      scale: 'interval', // ordinal for Range
      params: {
        type: MODES.Histogram,
        ranges: [{ from: 0, to: DEFAULT_INTERVAL, label: '' }],
        maxBars: AUTO_BARS,
        format: undefined,
        parentFormat: undefined,
      },
    };
  },
  isTransferable: (column, newIndexPattern) => {
    const newField = newIndexPattern.getFieldByName(column.sourceField);

    return Boolean(
      newField &&
        newField.type === 'number' &&
        newField.aggregatable &&
        (!newField.aggregationRestrictions || newField.aggregationRestrictions.range)
    );
  },
  onFieldChange: (oldColumn, field) => {
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
    const indexPattern = state.indexPatterns[state.layers[layerId].indexPatternId];
    const currentField = indexPattern.getFieldByName(currentColumn.sourceField);
    const numberFormat = currentColumn.params.format;
    const numberFormatterPattern =
      numberFormat &&
      supportedFormats[numberFormat.id] &&
      supportedFormats[numberFormat.id].decimalsToPattern(numberFormat.params?.decimals || 0);

    const rangeFormatter = data.fieldFormats.deserialize({
      ...currentColumn.params.parentFormat,
      params: {
        ...currentColumn.params.parentFormat?.params,
        ...(numberFormat
          ? { id: numberFormat.id, params: { pattern: numberFormatterPattern } }
          : getFieldDefaultFormat(indexPattern, currentField)),
      },
    });

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
      const parentFormat =
        newMode === MODES.Range
          ? { id: 'range', params: { template: 'arrow_right', replaceInfinity: true } }
          : undefined;
      setState(
        mergeLayer({
          state,
          layerId,
          newLayer: {
            columns: {
              ...state.layers[layerId].columns,
              [columnId]: {
                ...currentColumn,
                scale,
                dataType,
                params: {
                  type: newMode,
                  ranges: [{ from: 0, to: DEFAULT_INTERVAL, label: '' }],
                  maxBars: maxBarsDefaultValue,
                  format: currentColumn.params.format,
                  parentFormat,
                },
              },
            },
          },
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
