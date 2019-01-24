/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage, injectI18n } from '@kbn/i18n/react';
import { Route } from 'react-router-dom';
import { NoMatch } from '../../../no_match';
import { healthToColor } from '../../../../services';
import { REFRESH_RATE_INDEX_LIST } from '../../../../constants';

import {
  EuiButton,
  EuiCallOut,
  EuiHealth,
  EuiLink,
  EuiCheckbox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiSearchBar,
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
  EuiText,
  EuiPageContent,
} from '@elastic/eui';

import { IndexActionsContextMenu } from '../../components';
import {
  getBannerExtensions,
  getFilterExtensions,
  getToggleExtensions,
} from '../../../../index_management_extensions';
import { renderBadges } from '../../../../lib/render_badges';

const HEADERS = {
  name: i18n.translate('xpack.idxMgmt.indexTable.headers.nameHeader', {
    defaultMessage: 'Name',
  }),
  health: i18n.translate('xpack.idxMgmt.indexTable.headers.healthHeader', {
    defaultMessage: 'Health',
  }),
  status: i18n.translate('xpack.idxMgmt.indexTable.headers.statusHeader', {
    defaultMessage: 'Status',
  }),
  primary: i18n.translate('xpack.idxMgmt.indexTable.headers.primaryHeader', {
    defaultMessage: 'Primaries',
  }),
  replica: i18n.translate('xpack.idxMgmt.indexTable.headers.replicaHeader', {
    defaultMessage: 'Replicas',
  }),
  documents: i18n.translate('xpack.idxMgmt.indexTable.headers.documentsHeader', {
    defaultMessage: 'Docs count',
  }),
  size: i18n.translate('xpack.idxMgmt.indexTable.headers.storageSizeHeader', {
    defaultMessage: 'Storage size',
  }),
};

export class IndexTableUi extends Component {
  static getDerivedStateFromProps(props, state) {
    // Deselct any indices which no longer exist, e.g. they've been deleted.
    const { selectedIndicesMap } = state;
    const indexNames = props.indices.map(index => index.name);
    const selectedIndexNames = Object.keys(selectedIndicesMap);
    const missingIndexNames = selectedIndexNames.filter(selectedIndexName => {
      return !indexNames.includes(selectedIndexName);
    });

    if (missingIndexNames.length) {
      const newMap = { ...selectedIndicesMap };
      missingIndexNames.forEach(missingIndexName => delete newMap[missingIndexName]);
      return { selectedIndicesMap: newMap };
    }

    return null;
  }

  constructor(props) {
    super(props);

    this.state = {
      selectedIndicesMap: {},
    };
  }
  componentDidMount() {
    this.props.loadIndices();
    this.interval = setInterval(this.props.reloadIndices, REFRESH_RATE_INDEX_LIST);
    const { filterChanged, filterFromURI } = this.props;
    if (filterFromURI) {
      const decodedFilter = decodeURIComponent(filterFromURI);
      filterChanged(EuiSearchBar.Query.parse(decodedFilter));
    }
  }
  componentWillUnmount() {
    clearInterval(this.interval);
  }
  onSort = column => {
    const { sortField, isSortAscending, sortChanged } = this.props;

    const newIsSortAscending = sortField === column ? !isSortAscending : true;
    sortChanged(column, newIsSortAscending);
  };
  renderFilterError() {
    const { intl } = this.props;
    const { filterError } = this.state;
    if (!filterError) {
      return;
    }
    return (
      <Fragment>
        <EuiCallOut
          iconType="faceSad"
          color="danger"
          title={intl.formatMessage(
            {
              id: 'xpack.idxMgmt.indexTable.invalidSearchErrorMessage',
              defaultMessage: 'Invalid search: {errorMessage}',
            },
            {
              errorMessage: filterError.message,
            }
          )}
        />
        <EuiSpacer size="l" />
      </Fragment>
    );
  }
  onFilterChanged = ({ query, error }) => {
    if (error) {
      this.setState({ filterError: error });
    } else {
      this.props.filterChanged(query);
      this.setState({ filterError: null });
    }
  };
  getFilters = () => {
    const { allIndices } = this.props;
    return getFilterExtensions().reduce((accum, filterExtension) => {
      const filtersToAdd = filterExtension(allIndices);
      return [...accum, ...filtersToAdd];
    }, []);
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
      selectedIndicesMap,
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
        selectedIndicesMap: newMap,
      };
    });
  };

  isItemSelected = name => {
    return !!this.state.selectedIndicesMap[name];
  };

  areAllItemsSelected = () => {
    const { indices } = this.props;
    const indexOfUnselectedItem = indices.findIndex(index => !this.isItemSelected(index.name));
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
          className={'indTable__header--' + fieldName}
          data-test-subj={`indexTableHeaderCell-${fieldName}`}
        >
          {label}
        </EuiTableHeaderCell>
      );
    });
  }

  buildRowCell(fieldName, value, index) {
    const { openDetailPanel } = this.props;
    if (fieldName === 'health') {
      return <EuiHealth color={healthToColor(value)}>{value}</EuiHealth>;
    } else if (fieldName === 'name') {
      return (
        <EuiLink
          className="indTable__link"
          data-test-subj="indexTableIndexNameLink"
          onClick={() => {
            openDetailPanel(value);
          }}
        >
          {value}{renderBadges(index)}
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
          className={'indTable__cell--' + fieldName}
          header={fieldName}
        >
          {this.buildRowCell(fieldName, value, index)}
        </EuiTableRowCell>
      );
    });
  }
  renderBanners() {
    const { allIndices = [], filterChanged } = this.props;
    return getBannerExtensions().map((bannerExtension, i) => {
      const bannerData = bannerExtension(allIndices);
      if (!bannerData) {
        return null;
      }

      const { type, title, message, filter, filterLabel } = bannerData;

      return (
        <Fragment key={`bannerExtension${i}`}>
          <EuiCallOut color={type} size="m" title={title}>
            <EuiText>
              {message}
              {filter ? (
                <EuiLink onClick={() => filterChanged(filter)}>{filterLabel}</EuiLink>
              ) : null}
            </EuiText>
          </EuiCallOut>
          <EuiSpacer size="m" />
        </Fragment>
      );
    });
  }
  buildRows() {
    const { indices = [], detailPanelIndexName } = this.props;
    return indices.map(index => {
      const { name } = index;
      return (
        <EuiTableRow
          isSelected={this.isItemSelected(name) || name === detailPanelIndexName}
          isSelectable
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
  renderToggleControl({ name, label }) {
    const { toggleNameToVisibleMap, toggleChanged } = this.props;
    return (
      <EuiFlexItem key={name} grow={false}>
        <EuiSwitch
          id={`checkboxToggles-{name}`}
          checked={toggleNameToVisibleMap[name]}
          onChange={event => toggleChanged(name, event.target.checked)}
          label={label}
        />
      </EuiFlexItem>
    );
  }
  render() {
    const {
      filter,
      showSystemIndices,
      showSystemIndicesChanged,
      indices,
      intl,
      loadIndices,
      indicesLoading,
      allIndices,
    } = this.props;
    const emptyState = indicesLoading ? (
      <EuiFlexGroup justifyContent="spaceAround">
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="xl" />
        </EuiFlexItem>
      </EuiFlexGroup>
    ) : (
      <NoMatch />
    );
    const { selectedIndicesMap } = this.state;
    const atLeastOneItemSelected = Object.keys(selectedIndicesMap).length > 0;
    return (
      <EuiPageContent>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="flexEnd">
          <EuiFlexItem grow={false}>
            <EuiTitle size="m">
              <h1>
                <FormattedMessage
                  id="xpack.idxMgmt.indexTable.sectionHeading"
                  defaultMessage="Index management"
                />
              </h1>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EuiText size="s" color="subdued">
              <p>
                <FormattedMessage
                  id="xpack.idxMgmt.indexTable.sectionDescription"
                  defaultMessage="Update your Elasticsearch indices individually or in bulk."
                />
              </p>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            {indicesLoading && allIndices.length === 0 ? null : (
              <EuiFlexGroup>
                {getToggleExtensions().map((toggle) => {
                  return this.renderToggleControl(toggle);
                })}
                <EuiFlexItem grow={false}>
                  <EuiSwitch
                    id="checkboxShowSystemIndices"
                    checked={showSystemIndices}
                    onChange={event => showSystemIndicesChanged(event.target.checked)}
                    label={
                      <FormattedMessage
                        id="xpack.idxMgmt.indexTable.systemIndicesSwitchLabel"
                        defaultMessage="Include system indices"
                      />
                    }
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer />
        {this.renderBanners()}
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
          {indicesLoading && allIndices.length === 0 ? null : (
            <Fragment>
              <EuiFlexItem>
                <EuiSearchBar
                  filters={(this.getFilters().length > 0) ? this.getFilters() : null}
                  defaultQuery={filter}
                  query={filter}
                  box={{
                    incremental: true,
                    placeholder: intl.formatMessage({
                      id: 'xpack.idxMgmt.indexTable.systemIndicesSearchInputPlaceholder',
                      defaultMessage: 'Search',
                    }),
                  }}
                  aria-label={intl.formatMessage({
                    id: 'xpack.idxMgmt.indexTable.systemIndicesSearchIndicesAriaLabel',
                    defaultMessage: 'Search indices',
                  })}
                  data-test-subj="indexTableFilterInput"
                  onChange={this.onFilterChanged}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  isLoading={indicesLoading}
                  color="secondary"
                  onClick={() => {
                    loadIndices();
                  }}
                  iconType="refresh"
                >
                  <FormattedMessage
                    id="xpack.idxMgmt.indexTable.reloadIndicesButton"
                    defaultMessage="Reload indices"
                  />
                </EuiButton>
              </EuiFlexItem>
            </Fragment>
          )}
        </EuiFlexGroup>
        {this.renderFilterError()}
        <EuiSpacer size="m" />

        {indices.length > 0 ? (
          <div style={{ maxWidth: '100%', overflow: 'auto' }}>
            <EuiTable className="indTable">
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
          </div>
        ) : (
          emptyState
        )}
        <EuiSpacer size="m" />
        {indices.length > 0 ? this.renderPager() : null}
      </EuiPageContent>
    );
  }
}

export const IndexTable = injectI18n(IndexTableUi);
