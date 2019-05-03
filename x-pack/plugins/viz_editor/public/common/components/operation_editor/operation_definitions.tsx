/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFieldNumber, EuiForm, EuiFormRow, EuiRange, EuiSelect } from '@elastic/eui';
import React from 'react';
import {
  AvgOperation,
  BasicOperation,
  CardinalityOperation,
  CountOperation,
  DatasourceField,
  DateHistogramOperation,
  FieldOperation,
  isFieldApplicableForScale,
  SelectOperation,
  SelectOperator,
  SumOperation,
  TermsOperation,
  WindowFunction,
  WindowOperation,
} from '../../../../common';
import { OperationSummary } from './operation_summary';
import { operationToName, VisModel } from '../../lib';

const FixedEuiRange = EuiRange as React.ComponentType<any>;

export type Scale = 'ordinal' | 'interval';
export type Cardinality = 'single' | 'multi';

export interface OperationEditorProps<T extends BasicOperation = BasicOperation> {
  children: any;
  operation: T;
  onOperationChange: (newOperation: SelectOperation) => void;
  onOperationRemove?: () => void;
  removable?: boolean;
  visModel: VisModel;
  allowedScale: Scale;
  allowedCardinality?: Cardinality;
  defaultOperator: (field: DatasourceField) => SelectOperator;
  canDrop?: (field: DatasourceField) => boolean;
}

export interface OperationDefinition<T extends BasicOperation> {
  // The human-friendly name of the operation
  name: string;

  // The type of the operation (e.g. 'sum', 'avg', etc)
  operator: T['operator'];

  // Filter the fields list down to only those supported by this
  // operation (e.g. numbers for sum operations, dates for histograms)
  applicableFields: (fields: DatasourceField[], props: OperationEditorProps) => DatasourceField[];

  // Provide a textual summary of the operation, maybe should return
  // a React component instead of a string?
  summarize?: (operation: T) => React.ReactNode;

  // Convert the specified current operation into a different operation
  // e.g. from count to sum, etc.
  toSelectOperation: (
    currentOperation: SelectOperation | undefined,
    fields: DatasourceField[]
  ) => SelectOperation;

  // The editor panel
  editor?: (props: OperationEditorProps<T>) => React.ReactElement;
}

function fieldOperationEditor(props: OperationEditorProps<FieldOperation>) {
  const { operation: operation, visModel, onOperationChange: onOperationChange } = props;
  const { argument } = operation;
  const opDefinition = getOperationDefinition(operation.operator);
  const options = opDefinition
    .applicableFields(visModel.datasource!.fields, props)
    .map((f: DatasourceField) => ({
      value: f.name,
      text: f.name,
    }));

  return (
    <EuiFormRow label="Field">
      <EuiSelect
        options={options}
        value={argument && argument.field}
        onChange={e =>
          onOperationChange({
            ...operation,
            id: operation.id || e.target.value,
            argument: {
              ...argument,
              field: e.target.value,
            },
          } as SelectOperation)
        }
      />
    </EuiFormRow>
  );
}

function termsOperationEditor(props: OperationEditorProps<TermsOperation>) {
  const { operation: operation, visModel, onOperationChange: onOperationChange } = props;
  const { argument } = operation;
  const opDefinition = getOperationDefinition(operation.operator);
  const options = opDefinition
    .applicableFields(visModel.datasource!.fields, props)
    .map((f: DatasourceField) => ({
      value: f.name,
      text: f.name,
    }));

  function toValue(orderBy: string, orderByDirection: 'asc' | 'desc') {
    return `${orderBy}-${orderByDirection}`;
  }

  function fromValue(value: string) {
    const parts = value.split('-');
    return { orderBy: parts[0], orderByDirection: parts[1] as 'asc' | 'desc' };
  }

  const select = Object.values(visModel.queries)[0]!.select;
  const orderOptions = select.flatMap(currentOperation => [
    {
      value: toValue(currentOperation.id, 'asc'),
      text: `${
        currentOperation === operation ? 'Alphabetical' : operationToName(currentOperation.operator)
      } asc.`,
    },
    {
      value: toValue(currentOperation.id, 'desc'),
      text: `${
        currentOperation === operation ? 'Alphabetical' : operationToName(currentOperation.operator)
      } desc.`,
    },
  ]);

  return (
    <EuiForm>
      <EuiFormRow label="Field">
        <EuiSelect
          options={options}
          value={argument && argument.field}
          onChange={e =>
            onOperationChange({
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
      <EuiFormRow label="Number of values">
        <FixedEuiRange
          min={1}
          max={20}
          step={1}
          value={argument && argument.size}
          showInput
          onChange={(e: any) =>
            onOperationChange({
              ...operation,
              argument: {
                ...argument,
                size: Number(e.target.value),
              },
            })
          }
          aria-label="Number of values"
        />
      </EuiFormRow>
      <EuiFormRow label="Order by">
        <EuiSelect
          options={orderOptions}
          value={
            argument &&
            toValue(
              argument.orderBy || select[select.length - 1].id,
              argument.orderByDirection || 'desc'
            )
          }
          onChange={(e: any) =>
            onOperationChange({
              ...operation,
              argument: {
                ...argument,
                ...fromValue(e.target.value),
              },
            })
          }
        />
      </EuiFormRow>
    </EuiForm>
  );
}

function dateHistogramOperationEditor(props: OperationEditorProps<DateHistogramOperation>) {
  const { operation: operation, visModel, onOperationChange: onOperationChange } = props;
  const { argument } = operation;
  const opDefinition = getOperationDefinition(operation.operator);
  const options = opDefinition
    .applicableFields(visModel.datasource!.fields, props)
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
            onOperationChange({
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
      <EuiFormRow label="Level of detail">
        <FixedEuiRange
          min={0}
          max={intervals.length - 1}
          step={1}
          value={argument && intervalToNumeric(argument.interval)}
          showTicks
          ticks={intervals.map((interval, index) => ({ label: interval, value: index }))}
          onChange={(e: any) =>
            onOperationChange({
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

function windowOperationEditor(props: OperationEditorProps<WindowOperation>) {
  const { operation: operation, visModel, onOperationChange: onOperationChange } = props;
  const { argument } = operation;
  const opDefinition = getOperationDefinition(operation.operator);
  const options = opDefinition
    .applicableFields(visModel.datasource!.fields, props)
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
            onOperationChange({
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
            onOperationChange({
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
            onOperationChange({
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

type PossibleOperationDefinitions<U extends BasicOperation = SelectOperation> = U extends any
  ? OperationDefinition<U>
  : never;

export const operations: PossibleOperationDefinitions[] = [
  {
    name: operationToName('column'),
    operator: 'column',
    applicableFields: (fields, { allowedScale }) =>
      fields.filter(isFieldApplicableForScale.bind(null, allowedScale)),
    editor: fieldOperationEditor,
    toSelectOperation(currentOperation: SelectOperation | undefined, fields: DatasourceField[]) {
      return {
        operator: 'column',
        id: (currentOperation && currentOperation.id) || getFieldName(currentOperation, fields),
        argument: { field: getFieldName(currentOperation, fields) },
      };
    },
    summarize(op) {
      return (
        <OperationSummary iconType="string" operation="Values" field={op.argument.field} />
      );
    },
  },

  {
    name: operationToName('count'),
    operator: 'count',
    applicableFields: () => [],
    toSelectOperation(currentOperation): CountOperation {
      return {
        operator: 'count',
        id: (currentOperation && currentOperation.id) || 'count',
      };
    },
    summarize(op: CountOperation) {
      return (
        <OperationSummary iconType="number" operation="Count" field="documents" />
      );
    },
  },

  {
    name: operationToName('avg'),
    operator: 'avg',
    applicableFields: numericAggFields,
    editor: fieldOperationEditor,
    toSelectOperation(
      currentOperation: SelectOperation | undefined,
      fields: DatasourceField[]
    ): AvgOperation {
      return {
        operator: 'avg',
        argument: {
          field: getFieldName(currentOperation, numericAggFields(fields)),
        },
        id:
          (currentOperation && currentOperation.id) ||
          getFieldName(currentOperation, numericAggFields(fields)),
      };
    },
    summarize(op: AvgOperation) {
      return (
        <OperationSummary iconType="number" operation="Average" field={op.argument.field} />
      );
    },
  },

  {
    name: operationToName('date_histogram'),
    operator: 'date_histogram',
    applicableFields: dateAggFields,
    editor: dateHistogramOperationEditor,
    toSelectOperation(
      currentOperation: SelectOperation | undefined,
      fields: DatasourceField[]
    ): DateHistogramOperation {
      return {
        operator: 'date_histogram',
        argument: {
          interval: 'd',
          field: getFieldName(currentOperation, dateAggFields(fields)),
        },
        id:
          (currentOperation && currentOperation.id) ||
          getFieldName(currentOperation, dateAggFields(fields)),
      };
    },
    summarize(op: DateHistogramOperation) {
      return (
        <OperationSummary iconType="calendar" operation="Date histogram" field={op.argument.field} />
      );
    },
  },

  {
    name: operationToName('cardinality'),
    operator: 'cardinality',
    applicableFields: aggregatableFields,
    editor: fieldOperationEditor,
    toSelectOperation(
      currentOperation: SelectOperation | undefined,
      fields: DatasourceField[]
    ): CardinalityOperation {
      return {
        operator: 'cardinality',
        argument: {
          field: getFieldName(currentOperation, aggregatableFields(fields)),
        },
        id:
          (currentOperation && currentOperation.id) ||
          getFieldName(currentOperation, aggregatableFields(fields)),
      };
    },
    summarize(op: CardinalityOperation) {
      return (
        <OperationSummary iconType="string" operation="Unique values" field={op.argument.field} />
      );
    },
  },

  {
    name: operationToName('terms'),
    operator: 'terms',
    applicableFields: aggregatableFields,
    editor: termsOperationEditor,
    toSelectOperation(
      currentOperation: SelectOperation | undefined,
      fields: DatasourceField[]
    ): TermsOperation {
      return {
        operator: 'terms',
        argument: {
          field: getFieldName(currentOperation, aggregatableFields(fields)),
          size: 5,
        },
        id:
          (currentOperation && currentOperation.id) ||
          getFieldName(currentOperation, aggregatableFields(fields)),
      };
    },
    summarize(op) {
      return (
        <OperationSummary iconType="string" operation="Top values" field={op.argument.field} />
      );
    },
  },

  {
    name: operationToName('sum'),
    operator: 'sum',
    applicableFields: numericAggFields,
    editor: fieldOperationEditor,
    toSelectOperation(
      currentOperation: SelectOperation | undefined,
      fields: DatasourceField[]
    ): SumOperation {
      return {
        operator: 'sum',
        argument: {
          field: getFieldName(currentOperation, numericAggFields(fields)),
        },
        id:
          (currentOperation && currentOperation.id) ||
          getFieldName(currentOperation, numericAggFields(fields)),
      };
    },
    summarize(op: SumOperation) {
      return (
        <OperationSummary iconType="number" operation="Sum" field={op.argument.field} />
      );
    },
  },

  {
    name: operationToName('window'),
    operator: 'window',
    applicableFields: numericAggFields,
    editor: windowOperationEditor,
    summarize(operation: SelectOperation) {
      const { windowFunction, windowSize, field } = (operation as WindowOperation).argument;
      return `${windowFunction} ${field} in window size ${windowSize}`;
    },
    toSelectOperation(
      currentOperation: SelectOperation | undefined,
      fields: DatasourceField[]
    ): WindowOperation {
      return {
        operator: 'window',
        argument: {
          field: getFieldName(currentOperation, numericAggFields(fields)),
          windowFunction: 'max',
          windowSize: 10,
        },
        id:
          (currentOperation && currentOperation.id) ||
          getFieldName(currentOperation, numericAggFields(fields)),
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

export const getOperationName = (operator: SelectOperator) => {
  const operation = operations.find(({ operator: type }) => type === operator);
  return operation && operation.name;
};

export const tryGetOperationDefinition = (operator: SelectOperator) =>
  operations.find(({ operator: type }) => type === operator);

export const getOperationDefinition = (operator: SelectOperator) => {
  const operation = tryGetOperationDefinition(operator);
  if (!operation) {
    throw new Error(`Could not find operation of type ${operator}`);
  }
  return operation;
};

export const getOperationSummary = (operation?: SelectOperation) => {
  const opDefinition =
    operation &&
    (tryGetOperationDefinition(operation.operator) as OperationDefinition<BasicOperation>);

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

  return `${getOperationName(operation.operator)}${fieldSummary}`;
};
