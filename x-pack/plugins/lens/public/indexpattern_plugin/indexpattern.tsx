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
import uuid from 'uuid';
import { DatasourceDimensionPanelProps, DatasourceDataPanelProps } from '../types';
import { getIndexPatterns } from './loader';
import { ChildDragDropProvider, DragDrop, DragContextState } from '../drag_drop';

type OperationType = 'value' | 'terms' | 'date_histogram';

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
    <ChildDragDropProvider {...props.dragDropContext}>
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
              <DragDrop key={field.name} value={field} draggable>
                {field.name}
              </DragDrop>
            ))}
        </div>
      </div>
    </ChildDragDropProvider>
  );
}

export type IndexPatternDimensionPanelProps = DatasourceDimensionPanelProps & {
  state: IndexPatternPrivateState;
  dragDropContext: DragContextState;
  setState: (newState: IndexPatternPrivateState) => void;
};

export function IndexPatternDimensionPanel(props: IndexPatternDimensionPanelProps) {
  const fields = props.state.indexPatterns[props.state.currentIndexPatternId].fields;
  const columns: IndexPatternColumn[] = fields.map((field, index) => ({
    operationId: `${index}`,
    label: `Value of ${field.name}`,
    dataType: field.type as DataType,
    isBucketed: false,

    operationType: 'value' as OperationType,
    sourceField: field.name,
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

  const selectedColumn: IndexPatternColumn | null = props.state.columns[props.columnId] || null;

  function canHandleDrop() {
    const { dragging } = props.dragDropContext;
    const field = dragging as IndexPatternField;

    return (
      !!field &&
      !!field.type &&
      filteredColumns.some(({ sourceField }) => sourceField === (field as IndexPatternField).name)
    );
  }

  function changeColumn(column: IndexPatternColumn) {
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
  }

  return (
    <ChildDragDropProvider {...props.dragDropContext}>
      <DragDrop
        data-test-subj="indexPattern-dropTarget"
        droppable={canHandleDrop()}
        onDrop={field => {
          const column = columns.find(
            ({ sourceField }) => sourceField === (field as IndexPatternField).name
          );

          if (!column) {
            // TODO: What do we do if we couldn't find a column?
            return;
          }

          changeColumn(column);
        }}
      >
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
          onChange={choices =>
            changeColumn(columns.find(({ operationId }) => operationId === choices[0].value)!)
          }
        />
      </DragDrop>
    </ChildDragDropProvider>
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
        return null;
      }

      const fieldNames = state.columnOrder.map(col => state.columns[col].sourceField);
      const expression = `esdocs index="${state.currentIndexPatternId}" fields="${fieldNames.join(
        ', '
      )}" sort="${fieldNames[0]}, DESC"`;

      return expression;
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
        generateColumnId: () => {
          // TODO: Come up with a more compact form of generating unique column ids
          return uuid.v4();
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
