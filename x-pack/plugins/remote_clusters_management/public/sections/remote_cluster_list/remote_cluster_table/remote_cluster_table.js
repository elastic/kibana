/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { i18n }  from '@kbn/i18n';
import { injectI18n } from '@kbn/i18n/react';

import {
  EuiCheckbox,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiSpacer,
  EuiTable,
  EuiTableBody,
  EuiTableHeader,
  EuiTableHeaderCell,
  EuiTableHeaderCellCheckbox,
  EuiTablePagination,
  EuiTableRow,
  EuiTableRowCell,
  EuiTableRowCellCheckbox,
  EuiToolTip,
} from '@elastic/eui';

const COLUMNS = [{
  name: i18n.translate('xpack.remoteClusters.remoteClusterTable.headers.nameHeader', {
    defaultMessage: 'ID',
  }),
  fieldName: 'id',
}];

export class RemoteClusterTableUi extends Component {
  static propTypes = {
    remoteClusters: PropTypes.array,
    pager: PropTypes.object.isRequired,
    filter: PropTypes.string.isRequired,
    sortField: PropTypes.string.isRequired,
    isSortAscending: PropTypes.bool.isRequired,
    closeDetailPanel: PropTypes.func.isRequired,
    filterChanged: PropTypes.func.isRequired,
    pageChanged: PropTypes.func.isRequired,
    pageSizeChanged: PropTypes.func.isRequired,
    sortChanged: PropTypes.func.isRequired,
  }

  static defaultProps = {
    remoteClusters: [],
  }

  static getDerivedStateFromProps(props, state) {
    // Deselct any remoteClusters which no longer exist, e.g. they've been disconnected.
    const { idToSelectedRemoteClusterMap } = state;
    const remoteClusterIds = props.remoteClusters.map(remoteCluster => remoteCluster.id);
    const selectedRemoteClusterIds = Object.keys(idToSelectedRemoteClusterMap);
    const missingRemoteClusterIds = selectedRemoteClusterIds.filter(selectedRemoteClusterId => {
      return !remoteClusterIds.includes(selectedRemoteClusterId);
    });

    if (missingRemoteClusterIds.length) {
      const newMap = { ...idToSelectedRemoteClusterMap };
      missingRemoteClusterIds.forEach(missingRemoteClusterId => delete newMap[missingRemoteClusterId]);
      return { idToSelectedRemoteClusterMap: newMap };
    }

    return null;
  }

  constructor(props) {
    super(props);

    this.state = {
      idToSelectedRemoteClusterMap: {},
    };
  }

  toggleAll = () => {
    const allSelected = this.areAllItemsSelected();

    if (allSelected) {
      return this.setState({ idToSelectedRemoteClusterMap: {} });
    }

    const { remoteClusters } = this.props;
    const idToSelectedRemoteClusterMap = {};

    remoteClusters.forEach(({ id }) => {
      idToSelectedRemoteClusterMap[id] = true;
    });

    this.setState({ idToSelectedRemoteClusterMap });
  };

  toggleItem = id => {
    this.setState(({ idToSelectedRemoteClusterMap }) => {
      const newMap = { ...idToSelectedRemoteClusterMap };

      if (newMap[id]) {
        delete newMap[id];
      } else {
        newMap[id] = true;
      }

      return { idToSelectedRemoteClusterMap: newMap };
    });
  };

  resetSelection = () => {
    this.setState({ idToSelectedRemoteClusterMap: {} });
  };

  deselectItems = (itemIds) => {
    this.setState(({ idToSelectedRemoteClusterMap }) => {
      const newMap = { ...idToSelectedRemoteClusterMap };
      itemIds.forEach(id => delete newMap[id]);
      return { idToSelectedRemoteClusterMap: newMap };
    });
  };

  areAllItemsSelected = () => {
    const { remoteClusters } = this.props;
    const indexOfUnselectedItem = remoteClusters.findIndex(
      remoteCluster => !this.isItemSelected(remoteCluster.id)
    );
    return indexOfUnselectedItem === -1;
  };

  isItemSelected = id => {
    return !!this.state.idToSelectedRemoteClusterMap[id];
  };

  getSelectedRemoteClusters() {
    const { remoteClusters } = this.props;
    const { idToSelectedRemoteClusterMap } = this.state;
    return Object.keys(idToSelectedRemoteClusterMap).map(remoteClusterId => {
      return remoteClusters.find(remoteCluster => remoteCluster.id === remoteClusterId);
    });
  }

  onSort = column => {
    const { sortField, isSortAscending, sortChanged } = this.props;

    const newIsSortAscending = sortField === column ? !isSortAscending : true;
    sortChanged(column, newIsSortAscending);
  };

  buildHeader() {
    const { sortField, isSortAscending } = this.props;
    return COLUMNS.map(({ name, fieldName }) => {
      const isSorted = sortField === fieldName;

      return (
        <EuiTableHeaderCell
          key={name}
          onSort={fieldName ? () => this.onSort(fieldName) : undefined}
          isSorted={isSorted}
          isSortAscending={isSortAscending}
          data-test-subj={`remoteClusterTableHeaderCell-${name}`}
        >
          {name}
        </EuiTableHeaderCell>
      );
    });
  }

  buildRowCells(remoteCluster) {
    const { openDetailPanel } = this.props;

    return COLUMNS.map(({ name, fieldName, render, truncateText }) => {
      const value = render ? render(remoteCluster) : remoteCluster[fieldName];
      let content;

      if (name === 'ID') {
        content = (
          <EuiLink
            data-test-subj="remoteClusterTableRemoteClusterLink"
            onClick={() => {
              openDetailPanel(remoteCluster.id);
            }}
          >
            {value}
          </EuiLink>
        );
      } else {
        content = <span>{value}</span>;
      }

      let wrappedContent;

      if (truncateText) {
        wrappedContent = (
          <EuiToolTip content={value}>
            {content}
          </EuiToolTip>
        );
      } else {
        wrappedContent = content;
      }

      return (
        <EuiTableRowCell
          key={`${remoteCluster.id}-${name}`}
          data-test-subj={`remoteClusterTableCell-${name}`}
          truncateText={truncateText}
        >
          {wrappedContent}
        </EuiTableRowCell>
      );
    });
  }

  buildRows() {
    const { remoteClusters } = this.props;

    return remoteClusters.map(remoteCluster => {
      const { id } = remoteCluster;

      return (
        <EuiTableRow
          key={`${id}-row`}
        >
          <EuiTableRowCellCheckbox key={`checkbox-${id}`}>
            <EuiCheckbox
              type="inList"
              id={`checkboxSelectIndex-${id}`}
              checked={this.isItemSelected(id)}
              onChange={() => {
                this.toggleItem(id);
              }}
              data-test-subj="indexTableRowCheckbox"
            />
          </EuiTableRowCellCheckbox>

          {this.buildRowCells(remoteCluster)}
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
        itemsPerPageOptions={[20, 50, 100]}
        pageCount={pager.getTotalPages()}
        onChangeItemsPerPage={pageSizeChanged}
        onChangePage={pageChanged}
      />
    );
  }

  render() {
    const {
      filterChanged,
      filter,
      remoteClusters,
      intl,
      // closeDetailPanel,
    } = this.props;

    const { idToSelectedRemoteClusterMap } = this.state;

    const atLeastOneItemSelected = Object.keys(idToSelectedRemoteClusterMap).length > 0;

    return (
      <Fragment>
        <EuiFlexGroup gutterSize="l" alignItems="center">
          {atLeastOneItemSelected ? (
            <EuiFlexItem grow={false}>
              {/*<RemoteClusterActionMenu
                remoteClusters={this.getSelectedRemoteClusters()}
                closeDetailPanel={closeDetailPanel}
                resetSelection={this.resetSelection}
                deselectRemoteClusters={this.deselectItems}
              />*/}
            </EuiFlexItem>
          ) : null}
          <EuiFlexItem>
            <EuiFieldSearch
              fullWidth
              value={filter}
              onChange={event => {
                filterChanged(event.target.value);
              }}
              data-test-subj="remoteClusterTableFilterInput"
              placeholder={
                intl.formatMessage({
                  id: 'xpack.remoteClusters.remoteClusterTable.searchInputPlaceholder',
                  defaultMessage: 'Search',
                })
              }
              aria-label="Search remoteClusters"
            />
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer size="m" />

        {remoteClusters.length > 0 ? (
          <EuiTable>
            <EuiTableHeader>
              <EuiTableHeaderCellCheckbox>
                <EuiCheckbox
                  id="selectAllRemoteClustersCheckbox"
                  checked={this.areAllItemsSelected()}
                  onChange={this.toggleAll}
                  type="inList"
                />
              </EuiTableHeaderCellCheckbox>
              {this.buildHeader()}
            </EuiTableHeader>

            <EuiTableBody>
              {this.buildRows()}
            </EuiTableBody>
          </EuiTable>
        ) : (
          <div>
            No remote clusters to show
          </div>
        )}

        <EuiSpacer size="m" />

        {remoteClusters.length > 0 ? this.renderPager() : null}
      </Fragment>
    );
  }
}

export const RemoteClusterTable = injectI18n(RemoteClusterTableUi);
