/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render } from 'react-dom';
import { Datasource, Operation, DataType } from '..';

interface IndexPatternPrivateState {
  query: object;
}

// Not stateful. State is persisted to the frame
export const indexPatternDatasource: Datasource<IndexPatternPrivateState> = {
  async initialize() {
    return { query: {} };
  },

  toExpression(state: IndexPatternPrivateState) {
    return `${JSON.stringify(state.query)}`;
  },

  renderDataPanel({ domElement }: { domElement: Element }) {
    render(<div>Index Pattern Data Source</div>, domElement);
  },

  getPublicAPI() {
    // TODO: Provide state to each of these
    return {
      getTableSpec: () => [],
      getOperationForColumnId: () => ({
        id: '',
        // User-facing label for the operation
        label: '',
        dataType: 'string' as DataType,
        // A bucketed operation has many values the same
        isBucketed: false,
      }),

      // Called by dimension
      getDimensionPanelComponent: (props: any) => (
        domElement: Element,
        operations: Operation[]
      ) => {},

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
