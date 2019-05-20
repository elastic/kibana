/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render } from 'react-dom';
import { Datasource, DataType } from '..';
import { DatasourceDimensionPanelProps, DatasourceDataPanelProps } from '../types';

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
  fields: Field[];
  title: string;
  timeFieldName?: string;
}

export interface Field {
  name: string;
  type: string;
  aggregatable: boolean;
  searchable: boolean;
}

export interface IndexPatternPersistedState {
  currentIndexPattern: string;

  columnOrder: string[];
  columns: {
    [columnId: string]: IndexPatternColumn;
  };
}

export type IndexPatternPrivateState = IndexPatternPersistedState & {
  indexPatterns: { [id: string]: IndexPattern };
};

// Not stateful. State is persisted to the frame
export const indexPatternDatasource: Datasource<
  IndexPatternPrivateState,
  IndexPatternPersistedState
> = {
  async initialize(state?: IndexPatternPersistedState) {
    // TODO: Make fetch request to load indexPatterns from saved objects
    if (state) {
      return {
        ...state,
        indexPatterns: {},
      };
    }
    return {
      currentIndexPattern: '',
      indexPatterns: {},
      columns: {},
      columnOrder: [],
    };
  },

  getPersistableState({ currentIndexPattern, columns, columnOrder }: IndexPatternPrivateState) {
    return { currentIndexPattern, columns, columnOrder };
  },

  toExpression(state: IndexPatternPrivateState) {
    return `${JSON.stringify(state.columns)}`;
  },

  renderDataPanel(domElement: Element, props: DatasourceDataPanelProps<IndexPatternPrivateState>) {
    render(<div>Index Pattern Data Source</div>, domElement);
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

      renderDimensionPanel: (domElement: Element, props: DatasourceDimensionPanelProps) => {},

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
