/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiForm } from '@elastic/eui';

import { RangeEditor } from './range_editor';
import { OperationDefinition } from '../index';
import { FieldBasedIndexPatternColumn } from '../column_types';
import { updateColumnParam, changeColumn } from '../../../state_helpers';

// TODO update with the AutoInterval PR when ready
export const autoInterval = 0;
export const DEFAULT_INTERVAL = 1000;

export const MODES = {
  Range: 'range',
  Histogram: 'histogram',
} as const;

export type MODES_TYPES = typeof MODES.Range | typeof MODES.Histogram;

export interface RangeType {
  from: number;
  to: number;
  label: string;
}

export interface RangeIndexPatternColumn extends FieldBasedIndexPatternColumn {
  operationType: 'range';
  params: {
    type: MODES_TYPES;
    interval: number;
    maxBars: number;
    intervalBase?: number;
    ranges: RangeType[];
  };
}

export type RangeColumnParams = RangeIndexPatternColumn['params'];
export type UpdateParamsFnType = <K extends keyof RangeColumnParams>(
  paramName: K,
  value: RangeColumnParams[K]
) => void;

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
        maxBars: 1,
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
    return {
      id: columnId,
      enabled: true,
      type: column.params.type,
      schema: 'segment',
      params: {
        field: column.sourceField,
        ranges: column.params.ranges.map(({ label, ...rawRange }) => ({ ...rawRange })),
        interval: column.params.interval,
        maxBars: column.params.maxBars,
        intervalBase: column.params.intervalBase,
        drop_partials: false,
        min_doc_count: 0,
        extended_bounds: {},
      },
    };
  },
  paramEditor: ({ state, setState, currentColumn, layerId, columnId }) => {
    const isAutoInterval = currentColumn.params.interval === autoInterval;
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
          isAutoInterval={isAutoInterval}
          setParam={setParam}
          params={currentColumn.params}
          onChangeMode={onChangeMode}
        />
      </EuiForm>
    );
  },
};
