/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render } from 'react-dom';
import { Chrome } from 'ui/chrome';
import { ToastNotifications } from 'ui/notify/toasts/toast_notifications';
import { EuiComboBox } from '@elastic/eui';
import { Datasource, DataType } from '..';
import { DatasourceDimensionPanelProps, DatasourceDataPanelProps, Operation } from '../types';
import { getIndexPatterns } from './loader';

type OperationType = 'value' | 'terms' | 'date_histogram';

interface IndexPatternColumn {
  // Public
  operationId: string;
  label: string;
  dataType: DataType;
  isBucketed: false;

  // Private
  operationType: OperationType;
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

export function IndexPatternDimensionPanel(props: IndexPatternDimensionPanelProps) {
  const fields = props.state.indexPatterns[props.state.currentIndexPatternId].fields;
  const columns: IndexPatternColumn[] = fields.map((field, index) => ({
    operationId: `${index}`,
    label: `Value of ${field.name}`,
    dataType: field.type as DataType,
    isBucketed: false,

    operationType: 'value',
  }));

  const filteredColumns = columns.filter(col => {
    const { operationId, label, dataType, isBucketed } = col;

    return props.filterOperations({
      id: operationId,
      label,
      dataType,
      isBucketed,
    });
  });

  let selectedColumn: IndexPatternColumn | null = null;
  if (props.columnId && props.state.columns[props.columnId]) {
    selectedColumn = props.state.columns[props.columnId];
  }

  return (
    <div>
      Dimension Panel
      <EuiComboBox
        data-test-subj="indexPattern-dimension"
        options={filteredColumns.map(col => ({
          label: col.label,
          value: col.operationId,
        }))}
        selectedOptions={
          selectedColumn
            ? [
                {
                  label: selectedColumn.label,
                  value: selectedColumn.operationId,
                },
              ]
            : []
        }
        singleSelection={{ asPlainText: true }}
        isClearable={false}
        onChange={choices => {
          if (!props.columnId) {
            return;
          }

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
      return `${JSON.stringify(state.columns)}`;
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
          if (columnId) {
            const { dataType, label, isBucketed, operationId } = column;
            return {
              id: operationId,
              label,
              dataType,
              isBucketed,
            };
          }
          return null;
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
