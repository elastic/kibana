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
import { ControlBar } from './controls';
import { TableType } from './table_type_configs';

interface TableProps {
  assignmentOptions: any[] | null;
  assignmentTitle: string | null;
  items: any[];
  renderAssignmentOptions?: (item: any, key: string) => any;
  showAssignmentOptions: boolean;
  type: TableType;
  actionHandler(action: string, payload?: any): void;
}

interface TableState {
  selection: any[];
}

const TableContainer = styled.div`
  padding: 16px;
`;

export class Table extends React.Component<TableProps, TableState> {
  constructor(props: TableProps) {
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
      actionHandler,
      assignmentOptions,
      renderAssignmentOptions,
      assignmentTitle,
      items,
      showAssignmentOptions,
      type,
    } = this.props;

    const pagination = {
      initialPageSize: TABLE_CONFIG.INITIAL_ROW_SIZE,
      pageSizeOptions: TABLE_CONFIG.PAGE_SIZE_OPTIONS,
    };

    const selectionOptions = {
      onSelectionChange: this.setSelection,
      selectable: () => true,
      selectableMessage: () => 'Select this beat',
      selection: this.state.selection,
    };

    return (
      <TableContainer>
        <ControlBar
          actionHandler={actionHandler}
          assignmentOptions={assignmentOptions}
          renderAssignmentOptions={renderAssignmentOptions}
          assignmentTitle={assignmentTitle}
          controlDefinitions={type.controlDefinitions(items)}
          selectionCount={this.state.selection.length}
          showAssignmentOptions={showAssignmentOptions}
        />
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
