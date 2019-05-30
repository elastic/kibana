/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React, { useState } from 'react';
import { render } from 'react-dom';
import { Chrome } from 'ui/chrome';
import { ToastNotifications } from 'ui/notify/toasts/toast_notifications';
import { EuiComboBox, EuiPopover, EuiButton, EuiFlexItem, EuiFlexGroup } from '@elastic/eui';
import { Datasource, DataType } from '..';
import { DatasourceDimensionPanelProps, DatasourceDataPanelProps } from '../types';
import { getIndexPatterns } from './loader';

type OperationType = 'value' | 'terms' | 'date_histogram' | 'sum' | 'average' | 'count';

const operations: OperationType[] = ['value', 'terms', 'date_histogram', 'sum', 'average', 'count'];

interface IndexPatternColumn {
  // Public
  operationId: string;
  label: string;
  dataType: DataType;
  isBucketed: boolean;

  // Private
  operationType: OperationType;
  sourceField: string;
}

export interface IndexPattern {
  id: string;
  fields: IndexPatternField[];
  title: string;
  timeFieldName?: string;
}

export interface IndexPatternField {
  name: string;
  type: string;
  esTypes?: string[];
  aggregatable: boolean;
  searchable: boolean;
}

export interface IndexPatternPersistedState {
  currentIndexPatternId: string;

  columnOrder: string[];
  columns: Record<string, IndexPatternColumn>;
}

export type IndexPatternPrivateState = IndexPatternPersistedState & {
  indexPatterns: Record<string, IndexPattern>;
};

export function IndexPatternDataPanel(props: DatasourceDataPanelProps<IndexPatternPrivateState>) {
  return (
    <div>
      Index Pattern Data Source
      <div>
        <EuiComboBox
          data-test-subj="indexPattern-switcher"
          options={Object.values(props.state.indexPatterns).map(({ title, id }) => ({
            label: title,
            value: id,
          }))}
          selectedOptions={
            props.state.currentIndexPatternId
              ? [
                  {
                    label: props.state.indexPatterns[props.state.currentIndexPatternId].title,
                    value: props.state.indexPatterns[props.state.currentIndexPatternId].id,
                  },
                ]
              : undefined
          }
          singleSelection={{ asPlainText: true }}
          isClearable={false}
          onChange={choices => {
            props.setState({
              ...props.state,
              currentIndexPatternId: choices[0].value as string,
            });
          }}
        />
        <div>
          {props.state.currentIndexPatternId &&
            props.state.indexPatterns[props.state.currentIndexPatternId].fields.map(field => (
              <div key={field.name}>{field.name}</div>
            ))}
        </div>
      </div>
    </div>
  );
}

export type IndexPatternDimensionPanelProps = DatasourceDimensionPanelProps & {
  state: IndexPatternPrivateState;
  setState: (newState: IndexPatternPrivateState) => void;
};

function getOperationTypesForField({ type }: IndexPatternField): OperationType[] {
  switch (type) {
    case 'date':
      return ['value', 'date_histogram'];
    case 'number':
      return ['value', 'sum', 'average'];
    case 'string':
      return ['value', 'terms'];
  }
  return [];
}

function getOperationResultType({ type }: IndexPatternField, op: OperationType): DataType {
  switch (op) {
    case 'value':
      return type as DataType;
    case 'average':
    case 'count':
    case 'sum':
      return 'number';
    case 'date_histogram':
      return 'date';
    case 'terms':
      return 'string';
  }
}

export function IndexPatternDimensionPanel(props: IndexPatternDimensionPanelProps) {
  const [isOpen, setOpen] = useState(false);

  const fields = props.state.indexPatterns[props.state.currentIndexPatternId].fields;

  const columns: IndexPatternColumn[] = fields
    .map((field, index) => {
      const validOperations = getOperationTypesForField(field);

      return validOperations.map(op => ({
        operationId: `${index}${op}`,
        label: `${op} of ${field.name}`,
        dataType: getOperationResultType(field, op),
        isBucketed: op !== 'terms' && op !== 'date_histogram',

        operationType: op,
        sourceField: field.name,
      }));
    })
    .reduce((prev, current) => prev.concat(current));

  columns.push({
    operationId: 'count',
    label: 'Count of Documents',
    dataType: 'number',
    isBucketed: false,

    operationType: 'count',
    sourceField: 'documents',
  });

  const filteredColumns = columns.filter(col => {
    const { operationId, label, dataType, isBucketed } = col;

    return props.filterOperations({
      id: operationId,
      label,
      dataType,
      isBucketed,
    });
  });

  const selectedColumn: IndexPatternColumn | null = props.state.columns[props.columnId] || null;

  const uniqueColumns = _.uniq(filteredColumns, col => col.operationType);

  const columnsFromFunction = selectedColumn
    ? filteredColumns.filter(col => {
        return col.operationType === selectedColumn.operationType;
      })
    : filteredColumns;

  return (
    <div>
      Dimension Panel
      <EuiFlexItem grow={true}>
        <EuiPopover
          id={props.columnId}
          isOpen={isOpen}
          closePopover={() => {
            setOpen(false);
          }}
          ownFocus
          anchorPosition="rightCenter"
          button={
            <EuiButton
              onClick={() => {
                setOpen(!isOpen);
              }}
            >
              <span>{selectedColumn ? selectedColumn.label : 'Configure dimension'}</span>
            </EuiButton>
          }
        >
          <EuiFlexGroup wrap={true}>
            <EuiFlexItem grow={true}>
              <div>
                {operations.map(o => (
                  <EuiButton
                    key={o}
                    color={
                      selectedColumn && selectedColumn.operationType === o ? 'primary' : 'secondary'
                    }
                    isDisabled={!uniqueColumns.some(col => col.operationType === o)}
                    onClick={() => {
                      const newColumn: IndexPatternColumn = uniqueColumns.find(
                        col => col.operationType === o
                      )!;

                      props.setState({
                        ...props.state,
                        columnOrder: _.uniq(
                          Object.keys(props.state.columns).concat(props.columnId)
                        ),
                        columns: {
                          ...props.state.columns,
                          [props.columnId]: newColumn,
                        },
                      });
                    }}
                  >
                    <span>{o}</span>
                  </EuiButton>
                ))}
              </div>
            </EuiFlexItem>
            <EuiFlexItem grow={true}>
              <EuiComboBox
                data-test-subj="indexPattern-dimension"
                isDisabled={!selectedColumn}
                placeholder="Field"
                options={columnsFromFunction.map(col => ({
                  label: col.sourceField,
                  value: col.operationId,
                }))}
                selectedOptions={
                  selectedColumn
                    ? [
                        {
                          label: selectedColumn.sourceField,
                          value: selectedColumn.operationId,
                        },
                      ]
                    : []
                }
                singleSelection={{ asPlainText: true }}
                isClearable={false}
                onChange={choices => {
                  const column: IndexPatternColumn = columns.find(
                    ({ operationId }) => operationId === choices[0].value
                  )!;
                  const newColumns: IndexPatternPrivateState['columns'] = {
                    ...props.state.columns,
                    [props.columnId]: column,
                  };

                  props.setState({
                    ...props.state,
                    columns: newColumns,
                    // Order is not meaningful until we aggregate
                    columnOrder: Object.keys(newColumns),
                  });
                }}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPopover>
      </EuiFlexItem>
    </div>
  );
}

export function getIndexPatternDatasource(chrome: Chrome, toastNotifications: ToastNotifications) {
  // Not stateful. State is persisted to the frame
  const indexPatternDatasource: Datasource<IndexPatternPrivateState, IndexPatternPersistedState> = {
    async initialize(state?: IndexPatternPersistedState) {
      const indexPatternObjects = await getIndexPatterns(chrome, toastNotifications);
      const indexPatterns: Record<string, IndexPattern> = {};

      if (indexPatternObjects) {
        indexPatternObjects.forEach(obj => {
          indexPatterns[obj.id] = obj;
        });
      }

      if (state) {
        return {
          ...state,
          indexPatterns,
        };
      }
      return {
        currentIndexPatternId: indexPatternObjects ? indexPatternObjects[0].id : '',
        indexPatterns,
        columns: {},
        columnOrder: [],
      };
    },

    getPersistableState({ currentIndexPatternId, columns, columnOrder }: IndexPatternPrivateState) {
      return { currentIndexPatternId, columns, columnOrder };
    },

    toExpression(state: IndexPatternPrivateState) {
      if (state.columnOrder.length === 0) {
        return '';
      }

      const fieldNames = state.columnOrder.map(col => state.columns[col].sourceField);
      const sortedColumns = state.columnOrder.map(col => state.columns[col]);

      if (sortedColumns.every(({ operationType }) => operationType === 'value')) {
        return `esdocs index="${state.currentIndexPatternId}" fields="${fieldNames.join(
          ', '
        )}" sort="${fieldNames[0]}, DESC"`;
      } else if (sortedColumns.length) {
        let topAgg: object;
        sortedColumns.forEach((col, index) => {
          if (topAgg) {
            topAgg = {
              [fieldNames[index]]: {
                [col.operationType]: {
                  field: col.sourceField,
                  aggs: topAgg as object,
                },
              },
            };
          } else {
            topAgg = {
              [fieldNames[index]]: {
                [col.operationType]: {
                  field: col.sourceField,
                },
              },
            };
          }
        });

        return `esaggs index="${state.currentIndexPatternId}" aggs="${JSON.stringify(topAgg!)}"`;
      }

      return '';
    },

    renderDataPanel(
      domElement: Element,
      props: DatasourceDataPanelProps<IndexPatternPrivateState>
    ) {
      render(<IndexPatternDataPanel {...props} />, domElement);
    },

    getPublicAPI(state, setState) {
      return {
        getTableSpec: () => {
          return state.columnOrder.map(colId => ({ columnId: colId }));
        },
        getOperationForColumnId: (columnId: string) => {
          const column = state.columns[columnId];
          const { dataType, label, isBucketed, operationId } = column;
          return {
            id: operationId,
            label,
            dataType,
            isBucketed,
          };
        },

        renderDimensionPanel: (domElement: Element, props: DatasourceDimensionPanelProps) => {
          render(
            <IndexPatternDimensionPanel state={state} setState={setState} {...props} />,
            domElement
          );
        },

        removeColumnInTableSpec: (columnId: string) => [],
        moveColumnTo: (columnId: string, targetIndex: number) => {},
        duplicateColumn: (columnId: string) => [],
      };
    },

    getDatasourceSuggestionsForField() {
      return [];
    },

    getDatasourceSuggestionsFromCurrentState() {
      return [];
    },
  };

  return indexPatternDatasource;
}
