/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFieldNumber, EuiForm, EuiFormRow, EuiIcon, EuiRange, EuiSelect } from '@elastic/eui';
import React from 'react';
import {
  AvgOperation,
  CardinalityOperation,
  ColumnOperation,
  CountOperation,
  DatasourceField,
  DateHistogramOperation,
  FieldOperation,
  SelectOperation,
  SumOperation,
  TermsOperation,
  WindowFunction,
  WindowOperation,
} from '../../../../common';
import { operationToName } from '../../lib';

const FixedEuiRange = EuiRange as React.ComponentType<any>;

export interface OperationEditorProps {
  children: any;
  column: SelectOperation;
  onColumnChange: (newColumn: SelectOperation) => void;
  visModel: any;
  allowedOperations?: Array<SelectOperation['operation']>;
  allowedColumnTypes?: string[];
}

export interface OperationDefinition {
  // The human-friendly name of the operation
  name: string;

  // The type of the operation (e.g. 'sum', 'avg', etc)
  type: SelectOperation['operation'];

  // Filter the fields list down to only those supported by this
  // operation (e.g. numbers for sum operations, dates for histograms)
  applicableFields: (fields: DatasourceField[], props: OperationEditorProps) => DatasourceField[];

  // Provide a textual summary of the operation, maybe should return
  // a React component instead of a string?
  summarize?: (operation: any) => React.ReactNode;

  // Convert the specified current operation into a different operation
  // e.g. from count to sum, etc.
  toSelectClause: (
    currentOperation: SelectOperation | undefined,
    fields: DatasourceField[]
  ) => SelectOperation;

  // The editor panel
  editor?: (props: OperationEditorProps) => React.ReactElement;
}

function fieldOperationEditor(props: OperationEditorProps) {
  const { column, visModel, onColumnChange } = props;
  const operation = column as FieldOperation;
  const { argument } = operation;
  const opDefinition = getOperationDefinition(column.operation);
  const options = opDefinition
    .applicableFields(visModel.datasource.fields, props)
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
          alias: e.target.value,
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

function dateHistogramOperationEditor(props: OperationEditorProps) {
  const { column, visModel, onColumnChange } = props;
  const operation = column as DateHistogramOperation;
  const { argument } = operation;
  const opDefinition = getOperationDefinition(column.operation);
  const options = opDefinition
    .applicableFields(visModel.datasource.fields, props)
    .map((f: DatasourceField) => ({
      value: f.name,
      text: f.name,
    }));

  const intervals = ['M', 'w', 'd', 'h'];

  function intervalToNumeric(interval: string) {
    return intervals.indexOf(interval);
  }

  function numericToInterval(i: number) {
    return intervals[i];
  }

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
      <EuiFormRow label="Level of Detail">
        <FixedEuiRange
          min={0}
          max={intervals.length}
          step={1}
          value={argument && intervalToNumeric(argument.interval)}
          showTicks
          ticks={intervals.map((interval, index) => ({ label: interval, value: index }))}
          onChange={(e: any) =>
            onColumnChange({
              ...operation,
              argument: {
                ...argument,
                interval: numericToInterval(Number(e.target.value)),
              },
            })
          }
          aria-label="Level of Detail"
        />
      </EuiFormRow>
    </EuiForm>
  );
}

function windowOperationEditor(props: OperationEditorProps) {
  const { column, visModel, onColumnChange } = props;
  const operation = column as WindowOperation;
  const { argument } = operation;
  const opDefinition = getOperationDefinition(column.operation);
  const options = opDefinition
    .applicableFields(visModel.datasource.fields, props)
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
    name: operationToName('column'),
    type: 'column',
    applicableFields: (fields, { allowedColumnTypes }) =>
      fields.filter(({ type }) => (allowedColumnTypes ? allowedColumnTypes.includes(type) : true)),
    editor: fieldOperationEditor,
    toSelectClause(
      currentOperation: SelectOperation | undefined,
      fields: DatasourceField[]
    ): ColumnOperation {
      return {
        operation: 'column',
        alias: getFieldName(currentOperation, fields),
        argument: { field: getFieldName(currentOperation, fields) },
      };
    },
    summarize(op: ColumnOperation) {
      return (
        <span>
          <EuiIcon type="string" className="configPanel-summary-icon" />
          {`Values of ${op.argument.field}`}
        </span>
      );
    },
  },

  {
    name: operationToName('count'),
    type: 'count',
    applicableFields: () => [],
    toSelectClause(): CountOperation {
      return {
        operation: 'count',
      };
    },
    summarize(op: CountOperation) {
      return (
        <span>
          <EuiIcon type="number" className="configPanel-summary-icon" />
          {` Count`}
        </span>
      );
    },
  },

  {
    name: operationToName('avg'),
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
    summarize(op: AvgOperation) {
      return (
        <span>
          <EuiIcon type="number" className="configPanel-summary-icon" />
          {` Average of ${op.argument.field}`}
        </span>
      );
    },
  },

  {
    name: operationToName('date_histogram'),
    type: 'date_histogram',
    applicableFields: dateAggFields,
    editor: dateHistogramOperationEditor,
    toSelectClause(
      currentOperation: SelectOperation | undefined,
      fields: DatasourceField[]
    ): DateHistogramOperation {
      return {
        operation: 'date_histogram',
        argument: {
          interval: 'auto',
          field: getFieldName(currentOperation, dateAggFields(fields)),
        },
      };
    },
    summarize(op: DateHistogramOperation) {
      return (
        <span>
          <EuiIcon type="calendar" className="configPanel-summary-icon" />
          {` Date histogram of ${op.argument.field}`}
        </span>
      );
    },
  },

  {
    name: operationToName('cardinality'),
    type: 'cardinality',
    applicableFields: aggregatableFields,
    editor: fieldOperationEditor,
    toSelectClause(
      currentOperation: SelectOperation | undefined,
      fields: DatasourceField[]
    ): CardinalityOperation {
      return {
        operation: 'cardinality',
        argument: {
          field: getFieldName(currentOperation, aggregatableFields(fields)),
        },
      };
    },
    summarize(op: CardinalityOperation) {
      return (
        <div className="configPanel-summary">
          <EuiIcon type="string" className="configPanel-summary-icon" />
          <div className="configPanel-summary-text">
            <strong className="configPanel-summary-title">Unique Values of</strong>
            <span className="configPanel-summary-subtitle">{op.argument.field}</span>
          </div>
        </div>
      );
    },
  },

  {
    name: operationToName('terms'),
    type: 'terms',
    applicableFields: aggregatableFields,
    editor: fieldOperationEditor,
    toSelectClause(
      currentOperation: SelectOperation | undefined,
      fields: DatasourceField[]
    ): TermsOperation {
      return {
        operation: 'terms',
        argument: {
          field: getFieldName(currentOperation, aggregatableFields(fields)),
          size: 5,
        },
      };
    },
    summarize(op: CardinalityOperation) {
      return (
        <div className="configPanel-summary">
          <EuiIcon type="string" className="configPanel-summary-icon" />
          <div className="configPanel-summary-text">
            <strong className="configPanel-summary-title">Top Values of</strong>
            <span className="configPanel-summary-subtitle">{op.argument.field}</span>
          </div>
        </div>
      );
    },
  },

  {
    name: operationToName('sum'),
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
    summarize(op: SumOperation) {
      return (
        <span>
          <EuiIcon type="number" className="configPanel-summary-icon" />
          {` Sum of ${op.argument.field}`}
        </span>
      );
    },
  },

  {
    name: operationToName('window'),
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

export function aggregatableFields(fields: DatasourceField[]) {
  return fields.filter(f => f.aggregatable === true);
}

export function numericAggFields(fields: DatasourceField[]) {
  return fields.filter(f => f.type === 'number' && f.aggregatable === true);
}

export function dateAggFields(fields: DatasourceField[]) {
  return fields.filter(f => f.type === 'date' && f.aggregatable === true);
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
