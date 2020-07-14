/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import _ from 'lodash';
import { getMapsSavedObjectLoader } from '../../bootstrap/services/gis_map_saved_object_loader';
import {
  getMapsCapabilities,
  getUiSettings,
  getToasts,
  getCoreChrome,
} from '../../../kibana_services';
import {
  EuiTitle,
  EuiFieldSearch,
  EuiBasicTable,
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiLink,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiSpacer,
  EuiOverlayMask,
  EuiConfirmModal,
  EuiCallOut,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { addHelpMenuToAppChrome } from '../../../help_menu_util';
import { Link } from 'react-router-dom';
import { updateBreadcrumbs } from '../../page_elements/breadcrumbs';
import { goToSpecifiedPath } from '../../maps_router';

export const EMPTY_FILTER = '';

export class MapsListView extends React.Component {
  state = {
    hasInitialFetchReturned: false,
    isFetchingItems: false,
    showDeleteModal: false,
    showLimitError: false,
    filter: EMPTY_FILTER,
    items: [],
    selectedIds: [],
    page: 0,
    perPage: 20,
    readOnly: !getMapsCapabilities().save,
    listingLimit: getUiSettings().get('savedObjects:listingLimit'),
  };

  UNSAFE_componentWillMount() {
    this._isMounted = true;
    updateBreadcrumbs();
  }

  componentWillUnmount() {
    this._isMounted = false;
    this.debouncedFetch.cancel();
  }

  componentDidMount() {
    this.initMapList();
  }

  async initMapList() {
    this.fetchItems();
    addHelpMenuToAppChrome();
    getCoreChrome().docTitle.change('Maps');
  }

  _find = (search) => getMapsSavedObjectLoader().find(search, this.state.listingLimit);

  _delete = (ids) => getMapsSavedObjectLoader().delete(ids);

  debouncedFetch = _.debounce(async (filter) => {
    const response = await this._find(filter);

    if (!this._isMounted) {
      return;
    }

    // We need this check to handle the case where search results come back in a different
    // order than they were sent out. Only load results for the most recent search.
    if (filter === this.state.filter) {
      this.setState({
        hasInitialFetchReturned: true,
        isFetchingItems: false,
        items: response.hits,
        totalItems: response.total,
        showLimitError: response.total > this.state.listingLimit,
      });
    }
  }, 300);

  fetchItems = () => {
    this.setState(
      {
        isFetchingItems: true,
      },
      this.debouncedFetch.bind(null, this.state.filter)
    );
  };

  deleteSelectedItems = async () => {
    try {
      await this._delete(this.state.selectedIds);
    } catch (error) {
      getToasts().addDanger({
        title: i18n.translate('xpack.maps.mapListing.unableToDeleteToastTitle', {
          defaultMessage: `Unable to delete map(s)`,
        }),
        text: `${error}`,
      });
    }
    this.fetchItems();
    this.setState({
      selectedIds: [],
    });
    this.closeDeleteModal();
  };

  closeDeleteModal = () => {
    this.setState({ showDeleteModal: false });
  };

  openDeleteModal = () => {
    this.setState({ showDeleteModal: true });
  };

  onTableChange = ({ page, sort = {} }) => {
    const { index: pageIndex, size: pageSize } = page;

    let { field: sortField, direction: sortDirection } = sort;

    // 3rd sorting state that is not captured by sort - native order (no sort)
    // when switching from desc to asc for the same field - use native order
    if (
      this.state.sortField === sortField &&
      this.state.sortDirection === 'desc' &&
      sortDirection === 'asc'
    ) {
      sortField = null;
      sortDirection = null;
    }

    this.setState({
      page: pageIndex,
      perPage: pageSize,
      sortField,
      sortDirection,
    });
  };

  getPageOfItems = () => {
    // do not sort original list to preserve elasticsearch ranking order
    const itemsCopy = this.state.items.slice();

    if (this.state.sortField) {
      itemsCopy.sort((a, b) => {
        const fieldA = _.get(a, this.state.sortField, '');
        const fieldB = _.get(b, this.state.sortField, '');
        let order = 1;
        if (this.state.sortDirection === 'desc') {
          order = -1;
        }
        return order * fieldA.toLowerCase().localeCompare(fieldB.toLowerCase());
      });
    }

    // If begin is greater than the length of the sequence, an empty array is returned.
    const startIndex = this.state.page * this.state.perPage;
    // If end is greater than the length of the sequence, slice extracts through to the end of the sequence (arr.length).
    const lastIndex = startIndex + this.state.perPage;
    return itemsCopy.slice(startIndex, lastIndex);
  };

  hasNoItems() {
    if (!this.state.isFetchingItems && this.state.items.length === 0 && !this.state.filter) {
      return true;
    }

    return false;
  }

  renderConfirmDeleteModal() {
    return (
      <EuiOverlayMask>
        <EuiConfirmModal
          title={i18n.translate('xpack.maps.mapListing.deleteSelectedItemsTitle', {
            defaultMessage: 'Delete selected items?',
          })}
          onCancel={this.closeDeleteModal}
          onConfirm={this.deleteSelectedItems}
          cancelButtonText={i18n.translate('xpack.maps.mapListing.cancelTitle', {
            defaultMessage: 'Cancel',
          })}
          confirmButtonText={i18n.translate('xpack.maps.mapListing.deleteTitle', {
            defaultMessage: 'Delete',
          })}
          defaultFocusedButton="cancel"
        >
          <p>
            <FormattedMessage
              id="xpack.maps.mapListing.deleteWarning"
              defaultMessage="You can't recover deleted items."
            />
          </p>
        </EuiConfirmModal>
      </EuiOverlayMask>
    );
  }

  renderListingLimitWarning() {
    if (this.state.showLimitError) {
      return (
        <React.Fragment>
          <EuiCallOut
            title={i18n.translate('xpack.maps.mapListing.limitExceededTitle', {
              defaultMessage: 'Listing limit exceeded',
            })}
            color="warning"
            iconType="help"
          >
            <p>
              <FormattedMessage
                id="xpack.maps.mapListing.limitHelpDescription"
                defaultMessage="You have {totalItems} items,
            but your <strong>listingLimit</strong> setting prevents the table below from displaying more than {listingLimit}.
            You can change this setting under "
                values={{
                  totalItems: this.state.totalItems,
                  listingLimit: this.state.listingLimit,
                }}
              />
              <EuiLink href="#/management/kibana/settings">
                <FormattedMessage
                  id="xpack.maps.mapListing.advancedSettingsLinkText"
                  defaultMessage="Advanced Settings"
                />
              </EuiLink>
              .
            </p>
          </EuiCallOut>
          <EuiSpacer size="m" />
        </React.Fragment>
      );
    }
  }

  renderNoResultsMessage() {
    if (this.state.isFetchingItems) {
      return '';
    }

    if (this.hasNoItems()) {
      return i18n.translate('xpack.maps.mapListing.noItemsDescription', {
        defaultMessage: `Looks like you don't have any maps. Click the create button to create one.`,
      });
    }

    return i18n.translate('xpack.maps.mapListing.noMatchDescription', {
      defaultMessage: 'No items matched your search.',
    });
  }

  renderSearchBar() {
    let deleteBtn;
    if (this.state.selectedIds.length > 0) {
      deleteBtn = (
        <EuiFlexItem grow={false}>
          <EuiButton
            color="danger"
            onClick={this.openDeleteModal}
            data-test-subj="deleteSelectedItems"
            key="delete"
          >
            <FormattedMessage
              id="xpack.maps.mapListing.deleteSelectedButtonLabel"
              defaultMessage="Delete selected"
            />
          </EuiButton>
        </EuiFlexItem>
      );
    }

    return (
      <EuiFlexGroup>
        {deleteBtn}
        <EuiFlexItem grow={true}>
          <EuiFieldSearch
            aria-label={i18n.translate('xpack.maps.mapListing.searchAriaLabel', {
              defaultMessage: 'Filter items',
            })}
            placeholder={i18n.translate('xpack.maps.mapListing.searchPlaceholder', {
              defaultMessage: 'Search...',
            })}
            fullWidth
            value={this.state.filter}
            onChange={(e) => {
              this.setState(
                {
                  filter: e.target.value,
                },
                this.fetchItems
              );
            }}
            data-test-subj="searchFilter"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  renderTable() {
    const tableColumns = [
      {
        field: 'title',
        name: i18n.translate('xpack.maps.mapListing.titleFieldTitle', {
          defaultMessage: 'Title',
        }),
        sortable: true,
        render: (field, record) => (
          <EuiLink
            onClick={(e) => {
              e.preventDefault();
              goToSpecifiedPath(`/map/${record.id}`);
            }}
            data-test-subj={`mapListingTitleLink-${record.title.split(' ').join('-')}`}
          >
            {field}
          </EuiLink>
        ),
      },
      {
        field: 'description',
        name: i18n.translate('xpack.maps.mapListing.descriptionFieldTitle', {
          defaultMessage: 'Description',
        }),
        dataType: 'string',
        sortable: true,
      },
    ];
    const pagination = {
      pageIndex: this.state.page,
      pageSize: this.state.perPage,
      totalItemCount: this.state.items.length,
      pageSizeOptions: [10, 20, 50],
    };

    let selection = false;
    if (!this.state.readOnly) {
      selection = {
        onSelectionChange: (selection) => {
          this.setState({
            selectedIds: selection.map((item) => {
              return item.id;
            }),
          });
        },
      };
    }

    const sorting = {};
    if (this.state.sortField) {
      sorting.sort = {
        field: this.state.sortField,
        direction: this.state.sortDirection,
      };
    }
    const items = this.state.items.length === 0 ? [] : this.getPageOfItems();

    return (
      <EuiBasicTable
        itemId={'id'}
        items={items}
        loading={this.state.isFetchingItems}
        columns={tableColumns}
        selection={selection}
        noItemsMessage={this.renderNoResultsMessage()}
        pagination={pagination}
        sorting={sorting}
        onChange={this.onTableChange}
      />
    );
  }

  renderListing() {
    let createButton;
    if (!this.state.readOnly) {
      createButton = (
        <Link to={'/map'}>
          <EuiButton data-test-subj="newMapLink" fill>
            <FormattedMessage
              id="xpack.maps.mapListing.createMapButtonLabel"
              defaultMessage="Create map"
            />
          </EuiButton>
        </Link>
      );
    }
    return (
      <React.Fragment>
        {this.state.showDeleteModal && this.renderConfirmDeleteModal()}

        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" data-test-subj="top-nav">
          <EuiFlexItem grow={false}>
            <EuiTitle size="l">
              <h1>
                <FormattedMessage
                  id="xpack.maps.mapListing.listingTableTitle"
                  defaultMessage="Maps"
                />
              </h1>
            </EuiTitle>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>{createButton}</EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer size="m" />

        {this.renderListingLimitWarning()}

        {this.renderSearchBar()}

        <EuiSpacer size="m" />

        {this.renderTable()}
      </React.Fragment>
    );
  }

  renderPageContent() {
    if (!this.state.hasInitialFetchReturned) {
      return;
    }

    return <EuiPageContent horizontalPosition="center">{this.renderListing()}</EuiPageContent>;
  }

  render() {
    return (
      <EuiPage data-test-subj="mapsListingPage" restrictWidth>
        <EuiPageBody>{this.renderPageContent()}</EuiPageBody>
      </EuiPage>
    );
  }
}
