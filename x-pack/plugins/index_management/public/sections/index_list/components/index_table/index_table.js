/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import { Route } from 'react-router-dom';
import { NoMatch } from '../../../no_match';
import { healthToColor } from '../../../../services';

import '../../../../styles/table.less';

import {
  EuiHealth,
  EuiLink,
  EuiCheckbox,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPage,
  EuiSpacer,
  EuiSwitch,
  EuiTable,
  EuiTableBody,
  EuiTableHeader,
  EuiTableHeaderCell,
  EuiTableHeaderCellCheckbox,
  EuiTablePagination,
  EuiTableRow,
  EuiTableRowCell,
  EuiTableRowCellCheckbox,
  EuiTitle,
  EuiText
} from '@elastic/eui';

import { IndexActionsContextMenu } from '../../components';

const HEADERS = {
  name: 'Name',
  health: 'Health',
  status: 'Status',
  primary: 'Primaries',
  replica: 'Replicas',
  documents: 'Docs count',
  size: 'Storage size',
  primary_size: 'Primary storage size'
};

export class IndexTable extends Component {
  constructor(props) {
    super(props);

    this.state = {
      selectedIndicesMap: {}
    };
  }

  onSort = column => {
    const { sortField, isSortAscending, sortChanged } = this.props;

    const newIsSortAscending = sortField === column ? !isSortAscending : true;
    sortChanged(column, newIsSortAscending);
  };
  toggleAll = () => {
    const allSelected = this.areAllItemsSelected();
    if (allSelected) {
      return this.setState({ selectedIndicesMap: {} });
    }
    const { indices } = this.props;
    const selectedIndicesMap = {};
    indices.forEach(({ name }) => {
      selectedIndicesMap[name] = true;
    });
    this.setState({
      selectedIndicesMap
    });
  };
  toggleItem = name => {
    this.setState(({ selectedIndicesMap }) => {
      const newMap = { ...selectedIndicesMap };
      if (newMap[name]) {
        delete newMap[name];
      } else {
        newMap[name] = true;
      }
      return {
        selectedIndicesMap: newMap
      };
    });
  };
  isItemSelected = name => {
    return !!this.state.selectedIndicesMap[name];
  };

  areAllItemsSelected = () => {
    const { indices } = this.props;
    const indexOfUnselectedItem = indices.findIndex(
      index => !this.isItemSelected(index.name)
    );
    return indexOfUnselectedItem === -1;
  };

  buildHeader() {
    const { sortField, isSortAscending } = this.props;
    return Object.entries(HEADERS).map(([fieldName, label]) => {
      const isSorted = sortField === fieldName;
      return (
        <EuiTableHeaderCell
          key={fieldName}
          onSort={() => this.onSort(fieldName)}
          isSorted={isSorted}
          isSortAscending={isSortAscending}
          data-test-subj={`indexTableHeaderCell-${fieldName}`}
          className={'indexTable__header--' + fieldName}
        >
          {label}
        </EuiTableHeaderCell>
      );
    });
  }

  buildRowCell(fieldName, value) {
    const { openDetailPanel } = this.props;
    if (fieldName === 'health') {
      return <EuiHealth color={healthToColor(value)}>{value}</EuiHealth>;
    } else if (fieldName === 'name') {
      return (
        <EuiLink
          className="indexTable__link"
          data-test-subj="indexTableIndexNameLink"
          onClick={() => {
            openDetailPanel(value);
          }}
        >
          {value}
        </EuiLink>
      );
    }
    return value;
  }
  buildRowCells(index) {
    return Object.keys(HEADERS).map(fieldName => {
      const { name } = index;
      const value = index[fieldName];
      return (
        <EuiTableRowCell
          key={`${fieldName}-${name}`}
          truncateText={false}
          data-test-subj={`indexTableCell-${fieldName}`}
        >
          {this.buildRowCell(fieldName, value)}
        </EuiTableRowCell>
      );
    });
  }
  buildRows() {
    const { indices = [], detailPanelIndexName } = this.props;
    return indices.map(index => {
      const { name } = index;
      return (
        <EuiTableRow
          isSelected={
            this.isItemSelected(name) || name === detailPanelIndexName
          }
          key={`${name}-row`}
        >
          <EuiTableRowCellCheckbox key={`checkbox-${name}`}>
            <EuiCheckbox
              type="inList"
              id={`checkboxSelectIndex-${name}`}
              checked={this.isItemSelected(name)}
              onChange={() => {
                this.toggleItem(name);
              }}
              data-test-subj="indexTableRowCheckbox"
            />
          </EuiTableRowCellCheckbox>
          {this.buildRowCells(index)}
        </EuiTableRow>
      );
    });
  }

  renderPager() {
    const { pager, pageChanged, pageSizeChanged } = this.props;
    return (
      <EuiTablePagination
        activePage={pager.getCurrentPageIndex()}
        itemsPerPage={pager.itemsPerPage}
        itemsPerPageOptions={[10, 50, 100]}
        pageCount={pager.getTotalPages()}
        onChangeItemsPerPage={pageSizeChanged}
        onChangePage={pageChanged}
      />
    );
  }

  onItemSelectionChanged = selectedIndices => {
    this.setState({ selectedIndices });
  };

  render() {
    const {
      filterChanged,
      filter,
      showSystemIndices,
      showSystemIndicesChanged,
      indices
    } = this.props;

    const { selectedIndicesMap } = this.state;
    const atLeastOneItemSelected = Object.keys(selectedIndicesMap).length > 0;

    return (
      <EuiPage>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="flexEnd">
          <EuiFlexItem grow={false}>
            <EuiTitle size="l">
              <h1>Index management</h1>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EuiText>
              <p>Update your Elasticsearch indices individually or in bulk</p>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiSwitch
              id="checkboxShowSystemIndices"
              checked={showSystemIndices}
              onChange={event => showSystemIndicesChanged(event.target.checked)}
              label="Include system indices"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer />
        <EuiFlexGroup gutterSize="l" alignItems="center">
          {atLeastOneItemSelected ? (
            <EuiFlexItem grow={false}>
              <Route
                key="menu"
                render={() => (
                  <IndexActionsContextMenu
                    indexNames={Object.keys(selectedIndicesMap)}
                    resetSelection={() => {
                      this.setState({ selectedIndicesMap: {} });
                    }}
                  />
                )}
              />
            </EuiFlexItem>
          ) : null}
          <EuiFlexItem>
            <EuiFieldSearch
              fullWidth
              value={filter}
              onChange={event => {
                filterChanged(event.target.value);
              }}
              data-test-subj="indexTableFilterInput"
              placeholder="Search"
              aria-label="Search indices"
            />
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer size="m" />

        {indices.length > 0 ? (
          <EuiTable>
            <EuiTableHeader>
              <EuiTableHeaderCellCheckbox>
                <EuiCheckbox
                  id="selectAllIndexes"
                  checked={this.areAllItemsSelected()}
                  onChange={this.toggleAll}
                  type="inList"
                />
              </EuiTableHeaderCellCheckbox>
              {this.buildHeader()}
            </EuiTableHeader>
            <EuiTableBody>{this.buildRows()}</EuiTableBody>
          </EuiTable>
        ) : (
          <NoMatch />
        )}
        <EuiSpacer size="m" />
        {indices.length > 0 ? this.renderPager() : null}
      </EuiPage>
    );
  }
}
