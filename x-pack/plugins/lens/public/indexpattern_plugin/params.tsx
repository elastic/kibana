/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React from 'react';
import { EuiForm, EuiFormRow, EuiRange } from '@elastic/eui';
import {
  IndexPatternPrivateState,
  OperationType,
  DateHistogramIndexPatternColumn,
} from './indexpattern';

export interface ParamEditorProps {
  state: IndexPatternPrivateState;
  setState: (newState: IndexPatternPrivateState) => void;
  columnId: string;
}

type PropType<C> = C extends React.ComponentType<infer P> ? P : unknown;

// Add ticks to EuiRange component props
const FixedEuiRange = (EuiRange as unknown) as React.ComponentType<
  PropType<typeof EuiRange> & {
    ticks: Array<{
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
};

export function getParamEditors(): Partial<
  Record<OperationType, React.ComponentType<ParamEditorProps>>
> {
  return paramEditors;
}
