/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  // @ts-ignore no typings for EuiInMemoryTable in EUI
  EuiInMemoryTable,
  EuiSpacer,
} from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';
import { TABLE_CONFIG } from '../../../common/constants';
import { AssignmentControlSchema } from './assignment_schema';
import { ControlBar } from './controls';
import { TableType } from './table_type_configs';

export enum AssignmentActionType {
  Add,
  Assign,
  Delete,
  Edit,
  Reload,
  Search,
}

export interface AssignmentOptions {
  schema: AssignmentControlSchema[];
  items: any[];
  type?: 'none' | 'primary' | 'assignment';
  actionHandler(action: AssignmentActionType, payload?: any): void;
}

interface TableProps {
  assignmentOptions?: AssignmentOptions;
  hideTableControls?: boolean;
  items: any[];
  type: TableType;
}

interface TableState {
  selection: any[];
}

const TableContainer = styled.div`
  padding: 16px;
`;

export class Table extends React.Component<any, TableState> {
  constructor(props: any) {
    super(props);

    this.state = {
      selection: [],
    };
  }

  public resetSelection = () => {
    this.setSelection([]);
  };

  public setSelection = (selection: any[]) => {
    this.setState({
      selection,
    });
  };

  public render() {
    const {
      assignmentOptions,
      hideTableControls,
      items,
      type,
      isLoadingSuggestions,
      loadSuggestions,
      onKueryBarSubmit,
      isKueryValid,
      kueryValue,
      onKueryBarChange,
      suggestions,
      filterQueryDraft,
    } = this.props;

    const pagination = {
      initialPageSize: TABLE_CONFIG.INITIAL_ROW_SIZE,
      pageSizeOptions: TABLE_CONFIG.PAGE_SIZE_OPTIONS,
    };

    const selectionOptions = hideTableControls
      ? null
      : {
          onSelectionChange: this.setSelection,
          selectable: () => true,
          selectableMessage: () => 'Select this beat',
          selection: this.state.selection,
        };

    return (
      <TableContainer>
        {!hideTableControls &&
          assignmentOptions && (
            <ControlBar
              assignmentOptions={assignmentOptions}
              selectionCount={this.state.selection.length}
              isLoadingSuggestions={isLoadingSuggestions}
              kueryValue={kueryValue}
              isKueryValid={isKueryValid}
              loadSuggestions={loadSuggestions}
              onKueryBarChange={onKueryBarChange}
              onKueryBarSubmit={onKueryBarSubmit}
              suggestions={suggestions}
              filterQueryDraft={filterQueryDraft}
            />
          )}
        <EuiSpacer size="m" />
        <EuiInMemoryTable
          columns={type.columnDefinitions}
          items={items}
          itemId="id"
          isSelectable={true}
          pagination={pagination}
          selection={selectionOptions}
          sorting={true}
        />
      </TableContainer>
    );
  }
}
