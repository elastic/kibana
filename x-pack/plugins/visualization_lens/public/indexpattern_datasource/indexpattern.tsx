/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render } from 'react-dom';
import { Datasource, Operation, DataType } from '../';

interface IndexPatternPrivateState {
  query: object;
}

class IndexPatternDatasource implements Datasource<IndexPatternPrivateState> {
  private state?: IndexPatternPrivateState;

  constructor(state?: IndexPatternPrivateState) {
    if (state) {
      this.state = state;
    }
  }

  toExpression() {
    return '';
  }

  renderDataPanel({ domElement }: { domElement: Element }) {
    render(<div>Index Pattern Data Source</div>, domElement);
  }

  getPublicAPI() {
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
  }

  getDatasourceSuggestionsForField() {
    return [];
  }

  getDatasourceSuggestionsFromCurrentState() {
    return [];
  }
}

export { IndexPatternDatasource };

export const indexPatternDatasource = new IndexPatternDatasource();
