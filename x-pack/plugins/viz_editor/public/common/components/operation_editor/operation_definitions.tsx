/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFieldNumber, EuiForm, EuiFormLabel, EuiFormRow, EuiSelect } from '@elastic/eui';
import React from 'react';
import {
  AvgOperation,
  CountOperation,
  DatasourceField,
  FieldOperation,
  SelectOperation,
  SumOperation,
  WindowFunction,
  WindowOperation,
} from '../../../../common';

export interface OperationEditorProps {
  children: any;
  column: SelectOperation;
  onColumnChange: (newColumn: SelectOperation) => void;
  visModel: any;
}

export interface OperationDefinition {
  // The human-friendly name of the operation
  name: string;

  // The type of the operation (e.g. 'sum', 'avg', etc)
  type: string;

  // Filter the fields list down to only those supported by this
  // operation (e.g. numbers for sum operations, dates for histograms)
  applicableFields: (fields: DatasourceField[]) => DatasourceField[];

  // Provide a textual summary of the operation, maybe should return
  // a React component instead of a string?
  summarize?: (operation: SelectOperation) => string;

  // Convert the specified current operation into a different operation
  // e.g. from count to sum, etc.
  toSelectClause: (
    currentOperation: SelectOperation | undefined,
    fields: DatasourceField[]
  ) => SelectOperation;

  // The editor panel
  editor?: (props: OperationEditorProps) => React.ReactElement;
}

function fieldOperationEditor({ column, visModel, onColumnChange }: OperationEditorProps) {
  const operation = column as FieldOperation;
  const { argument } = operation;
  const opDefinition = getOperationDefinition(column.operation);
  const options = opDefinition
    .applicableFields(visModel.datasource.fields)
    .map((f: DatasourceField) => ({
      value: f.name,
      text: f.name,
    }));

  return (
    <EuiSelect
      options={options}
      value={argument && argument.field}
      onChange={e =>
        onColumnChange({
          ...operation,
          argument: {
            ...argument,
            field: e.target.value,
          },
        } as SelectOperation)
      }
      aria-label="Field"
    />
  );
}

function windowOperationEditor({ column, visModel, onColumnChange }: OperationEditorProps) {
  const operation = column as WindowOperation;
  const { argument } = operation;
  const opDefinition = getOperationDefinition(column.operation);
  const options = opDefinition
    .applicableFields(visModel.datasource.fields)
    .map((f: DatasourceField) => ({
      value: f.name,
      text: f.name,
    }));
  const calculations = [
    { value: 'max', text: 'Max' },
    { value: 'min', text: 'Min' },
    { value: 'sum', text: 'Sum' },
    { value: 'stdDev', text: 'Standard Deviation' },
    { value: 'unweightedAvg', text: 'Unweighted Average' },
    { value: 'linearWeightedAvg', text: 'Linear Weighted Average' },
    { value: 'ewma', text: 'Ewma' },
    { value: 'holt', text: 'Holt' },
    { value: 'holtWinters', text: 'Holt Winters' },
  ];

  return (
    <EuiForm>
      <EuiFormRow label="Field">
        <EuiSelect
          options={options}
          value={argument && argument.field}
          onChange={e =>
            onColumnChange({
              ...operation,
              argument: {
                ...argument,
                field: e.target.value,
              },
            })
          }
          aria-label="Field"
        />
      </EuiFormRow>
      <EuiFormRow label="Calculation">
        <EuiSelect
          options={calculations}
          value={argument && argument.windowFunction}
          onChange={e =>
            onColumnChange({
              ...operation,
              argument: {
                ...argument,
                windowFunction: e.target.value as WindowFunction,
              },
            })
          }
          aria-label="Window Function"
        />
      </EuiFormRow>
      <EuiFormRow label="Window size">
        <EuiFieldNumber
          value={argument && argument.windowSize}
          onChange={e =>
            onColumnChange({
              ...operation,
              argument: {
                ...argument,
                windowSize: parseInt(e.target.value, 10),
              },
            })
          }
          aria-label="Window size"
        />
      </EuiFormRow>
    </EuiForm>
  );
}

export const operations: OperationDefinition[] = [
  {
    name: 'Count',
    type: 'count',
    applicableFields: () => [],
    toSelectClause(): CountOperation {
      return {
        operation: 'count',
      };
    },
  },

  {
    name: 'Average',
    type: 'avg',
    applicableFields: numericAggFields,
    editor: fieldOperationEditor,
    toSelectClause(
      currentOperation: SelectOperation | undefined,
      fields: DatasourceField[]
    ): AvgOperation {
      return {
        operation: 'avg',
        argument: {
          field: getFieldName(currentOperation, numericAggFields(fields)),
        },
      };
    },
  },

  {
    name: 'Sum',
    type: 'sum',
    applicableFields: numericAggFields,
    editor: fieldOperationEditor,
    toSelectClause(
      currentOperation: SelectOperation | undefined,
      fields: DatasourceField[]
    ): SumOperation {
      return {
        operation: 'sum',
        argument: {
          field: getFieldName(currentOperation, numericAggFields(fields)),
        },
      };
    },
  },

  {
    name: 'Window',
    type: 'window',
    applicableFields: numericAggFields,
    editor: windowOperationEditor,
    summarize(operation: SelectOperation) {
      const { windowFunction, windowSize, field } = (operation as WindowOperation).argument;
      return `${windowFunction} ${field} in window size ${windowSize}`;
    },
    toSelectClause(
      currentOperation: SelectOperation | undefined,
      fields: DatasourceField[]
    ): WindowOperation {
      return {
        operation: 'window',
        argument: {
          field: getFieldName(currentOperation, numericAggFields(fields)),
          windowFunction: 'max',
          windowSize: 10,
        },
      };
    },
  },
];

export function numericAggFields(fields: DatasourceField[]) {
  return fields.filter(f => f.type === 'number' && f.aggregatable === true);
}

export function getFieldName(
  currentOperation: SelectOperation | undefined,
  fields: DatasourceField[]
): string {
  const field = fields[0];
  const argument = (currentOperation as FieldOperation).argument;

  // TODO: What should we do if there is no applicable field?
  return (argument && argument.field) || (field && field.name) || 'N/A';
}

export const getOperationName = (opType: string) => {
  const operation = operations.find(({ type }) => type === opType);
  return operation && operation.name;
};

export const tryGetOperationDefinition = (opType: string) =>
  operations.find(({ type }) => type === opType);

export const getOperationDefinition = (opType: string) => {
  const operation = tryGetOperationDefinition(opType);
  if (!operation) {
    throw new Error(`Could not find operation of type ${opType}`);
  }
  return operation;
};

export const getOperationSummary = (operation?: SelectOperation) => {
  const opDefinition = operation && tryGetOperationDefinition(operation.operation);

  // TODO: What should we do in this case?
  if (!operation || !opDefinition) {
    return 'N/A';
  }

  if (opDefinition.summarize) {
    return opDefinition.summarize(operation);
  }

  const argument = (operation as FieldOperation).argument;
  const fieldName = argument && argument.field;
  const fieldSummary = fieldName ? ` of ${fieldName}` : '';

  return `${getOperationName(operation.operation)}${fieldSummary}`;
};
