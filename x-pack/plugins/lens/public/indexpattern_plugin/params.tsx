/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React from 'react';
import { EuiForm, EuiFormRow, EuiRange, EuiSelect } from '@elastic/eui';
import {
  IndexPatternPrivateState,
  OperationType,
  DateHistogramIndexPatternColumn,
  TermsIndexPatternColumn,
} from './indexpattern';
import { isMetricOperation } from './operations';

export interface ParamEditorProps {
  state: IndexPatternPrivateState;
  setState: (newState: IndexPatternPrivateState) => void;
  columnId: string;
}

type PropType<C> = C extends React.ComponentType<infer P> ? P : unknown;

// Add ticks to EuiRange component props
const FixedEuiRange = (EuiRange as unknown) as React.ComponentType<
  PropType<typeof EuiRange> & {
    ticks?: Array<{
      label: string;
      value: number;
    }>;
  }
>;

const paramEditors: Partial<Record<OperationType, React.ComponentType<ParamEditorProps>>> = {
  date_histogram: ({ state, setState, columnId }) => {
    const column = state.columns[columnId] as DateHistogramIndexPatternColumn;
    const intervals = ['M', 'w', 'd', 'h'];

    function intervalToNumeric(interval: string) {
      return intervals.indexOf(interval);
    }

    function numericToInterval(i: number) {
      return intervals[i];
    }
    return (
      <EuiForm>
        <EuiFormRow label="Level of detail">
          <FixedEuiRange
            min={0}
            max={intervals.length - 1}
            step={1}
            value={intervalToNumeric(column.params.interval)}
            showTicks
            ticks={intervals.map((interval, index) => ({ label: interval, value: index }))}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setState({
                ...state,
                columns: {
                  ...state.columns,
                  [columnId]: {
                    ...column,
                    params: {
                      ...column.params,
                      interval: numericToInterval(Number(e.target.value)),
                    },
                  },
                },
              })
            }
            aria-label="Level of Detail"
          />
        </EuiFormRow>
      </EuiForm>
    );
  },
  terms: ({ state, setState, columnId: currentColumnId }) => {
    const currentColumn = state.columns[currentColumnId] as TermsIndexPatternColumn;
    function toValue(orderBy: TermsIndexPatternColumn['params']['orderBy']) {
      if (orderBy.type === 'alphabetical') {
        return orderBy.type;
      }
      return `${orderBy.type}-${orderBy.columnId}`;
    }

    function fromValue(value: string): TermsIndexPatternColumn['params']['orderBy'] {
      if (value === 'alphabetical') {
        return { type: 'alphabetical' };
      }
      const parts = value.split('-');
      return {
        type: 'column',
        columnId: parts[1],
      };
    }

    const orderOptions = Object.entries(state.columns)
      .filter(([_columnId, column]) => isMetricOperation(column.operationType))
      .map(([columnId, column]) => {
        return {
          value: toValue({ type: 'column', columnId }),
          text: column.label,
        };
      });
    orderOptions.push({
      value: toValue({ type: 'alphabetical' }),
      text: 'Alphabetical',
    });

    return (
      <EuiForm>
        <EuiFormRow label="Number of values">
          <FixedEuiRange
            min={1}
            max={20}
            step={1}
            value={currentColumn.params.size}
            showInput
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setState({
                ...state,
                columns: {
                  ...state.columns,
                  [currentColumnId]: {
                    ...currentColumn,
                    params: {
                      ...currentColumn.params,
                      size: Number(e.target.value),
                    },
                  },
                },
              })
            }
            aria-label="Number of values"
          />
        </EuiFormRow>
        <EuiFormRow label="Order by">
          <EuiSelect
            options={orderOptions}
            value={toValue(currentColumn.params.orderBy)}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              setState({
                ...state,
                columns: {
                  ...state.columns,
                  [currentColumnId]: {
                    ...currentColumn,
                    params: {
                      ...currentColumn.params,
                      orderBy: fromValue(e.target.value),
                    },
                  },
                },
              })
            }
          />
        </EuiFormRow>
      </EuiForm>
    );
  },
};

export function getParamEditors(): Partial<
  Record<OperationType, React.ComponentType<ParamEditorProps>>
> {
  return paramEditors;
}
