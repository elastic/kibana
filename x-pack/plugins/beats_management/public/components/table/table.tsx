/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiBasicTable, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import styled from 'styled-components';
import { QuerySuggestion } from '../../../../../../src/plugins/data/public';
import { TABLE_CONFIG } from '../../../../../legacy/plugins/beats_management/common/constants';
import { AutocompleteField } from '../autocomplete_field/index';
import { ControlSchema } from './action_schema';
import { OptionControl } from './controls/option_control';
import { TableType } from './table_type_configs';

export enum AssignmentActionType {
  Add,
  Assign,
  Delete,
  Edit,
  Reload,
  Search,
}

export interface KueryBarProps {
  filterQueryDraft: string;
  isLoadingSuggestions: boolean;
  isValid: boolean;
  loadSuggestions: (value: string, cursorPosition: number, maxCount?: number) => void;
  onChange?: (value: string) => void;
  onSubmit?: (value: string) => void;
  suggestions: QuerySuggestion[];
  value: string;
}

interface TableProps {
  actions?: ControlSchema[];
  actionData?: {
    [key: string]: any;
  };
  hideTableControls?: boolean;
  kueryBarProps?: KueryBarProps;
  items: any[];
  onTableChange?: (index: number, size: number) => void;
  type: TableType;
  actionHandler?(action: AssignmentActionType, payload?: any): void;
}

interface TableState {
  selection: any[];
  pageIndex: number;
}

const TableContainer = styled.div`
  padding: 16px;
`;

export class Table extends React.Component<TableProps, TableState> {
  constructor(props: any) {
    super(props);

    this.state = {
      selection: [],
      pageIndex: 0,
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

  public actionHandler = (action: AssignmentActionType, payload?: any): void => {
    if (this.props.actionHandler) {
      this.props.actionHandler(action, payload);
    }
  };

  public render() {
    const { actionData, actions, hideTableControls, items, kueryBarProps, type } = this.props;

    const pagination = {
      pageIndex: this.state.pageIndex,
      pageSize: TABLE_CONFIG.INITIAL_ROW_SIZE,
      pageSizeOptions: TABLE_CONFIG.PAGE_SIZE_OPTIONS,
    };

    const selectionOptions = hideTableControls
      ? undefined
      : {
          onSelectionChange: this.setSelection,
          selectable: () => true,
          selectableMessage: () =>
            i18n.translate('xpack.beatsManagement.table.selectThisBeatTooltip', {
              defaultMessage: 'Select this beat',
            }),
          selection: this.state.selection,
        };

    return (
      <TableContainer>
        <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
          {actions &&
            actions.map((action) => (
              <EuiFlexItem grow={false} key={action.name}>
                <OptionControl
                  {...action}
                  actionData={actionData}
                  actionHandler={this.actionHandler}
                  disabled={this.state.selection.length === 0}
                />
              </EuiFlexItem>
            ))}

          {kueryBarProps && (
            <EuiFlexItem>
              <AutocompleteField
                {...kueryBarProps}
                placeholder={i18n.translate(
                  'xpack.beatsManagement.table.filterResultsPlaceholder',
                  {
                    defaultMessage: 'Filter results',
                  }
                )}
              />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
        <EuiSpacer size="m" />

        <EuiBasicTable
          items={items}
          itemId="id"
          isSelectable={true}
          selection={selectionOptions}
          columns={type.columnDefinitions}
          pagination={{ ...pagination, totalItemCount: items.length }}
          onChange={this.onTableChange}
        />
      </TableContainer>
    );
  }

  private onTableChange = ({ page }: { page: { index: number; size: number } }) => {
    if (this.props.onTableChange) {
      this.props.onTableChange(page.index, page.size);
    }
    this.setState({
      pageIndex: page.index,
    });
  };
}
