/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


/*
 * React component for viewing and editing a filter list, a list of items
 * used for example to safe list items via a job detector rule.
 */

import PropTypes from 'prop-types';
import React, {
  Component
} from 'react';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPage,
  EuiPageContent,
  EuiSearchBar,
  EuiSpacer,
} from '@elastic/eui';

import { toastNotifications } from 'ui/notify';

import { EditFilterListHeader } from './header';
import { EditFilterListToolbar } from './toolbar';
import { ItemsGrid } from 'plugins/ml/components/items_grid';
import {
  isValidFilterListId,
  saveFilterList
} from './utils';
import { ml } from 'plugins/ml/services/ml_api_service';

const DEFAULT_ITEMS_PER_PAGE = 50;

// Returns the list of items that match the query entered in the EuiSearchBar.
function getMatchingFilterItems(searchBarQuery, items) {
  if (searchBarQuery === undefined) {
    return [...items];
  }

  // Convert the list of Strings into a list of Objects suitable for running through
  // the search bar query.
  const allItems = items.map(item => ({ value: item }));
  const matchingObjects =
    EuiSearchBar.Query.execute(searchBarQuery, allItems, { defaultFields: ['value'] });
  return matchingObjects.map(item => item.value);
}

function getActivePage(activePageState, itemsPerPage, numMatchingItems) {
  // Checks if supplied active page number from state is applicable for the number
  // of matching items in the grid, and if not returns the last applicable page number.
  let activePage = activePageState;
  const activePageStartIndex = itemsPerPage * activePageState;
  if (activePageStartIndex > numMatchingItems) {
    activePage = Math.max((Math.ceil(numMatchingItems / itemsPerPage)) - 1, 0); // Sets to 0 for 0 matches.
  }
  return activePage;
}

function returnToFiltersList() {
  window.location.href = `#/settings/filter_lists`;
}

export class EditFilterList extends Component {
  constructor(props) {
    super(props);

    this.state = {
      description: '',
      items: [],
      matchingItems: [],
      selectedItems: [],
      loadedFilter: {},
      newFilterId: '',
      isNewFilterIdInvalid: true,
      activePage: 0,
      itemsPerPage: DEFAULT_ITEMS_PER_PAGE,
      saveInProgress: false,
    };
  }

  componentDidMount() {
    const filterId = this.props.filterId;
    if (filterId !== undefined) {
      this.loadFilterList(filterId);
    } else {
      this.setState({ newFilterId: '' });
    }
  }

  loadFilterList = (filterId) => {
    ml.filters.filters({ filterId })
      .then((filter) => {
        this.setLoadedFilterState(filter);
      })
      .catch((resp) => {
        console.log(`Error loading filter ${filterId}:`, resp);
        toastNotifications.addDanger(`An error occurred loading details of filter ${filterId}`);
      });
  }

  setLoadedFilterState = (loadedFilter) => {
    // Store the loaded filter so we can diff changes to the items when saving updates.
    this.setState((prevState) => {
      const { itemsPerPage, searchQuery } = prevState;

      const matchingItems = getMatchingFilterItems(searchQuery, loadedFilter.items);
      const activePage = getActivePage(prevState.activePage, itemsPerPage, matchingItems.length);

      return {
        description: loadedFilter.description,
        items: [...loadedFilter.items],
        matchingItems,
        selectedItems: [],
        loadedFilter,
        isNewFilterIdInvalid: false,
        activePage,
        searchQuery,
        saveInProgress: false
      };
    });
  }

  updateNewFilterId = (newFilterId) => {
    this.setState({
      newFilterId,
      isNewFilterIdInvalid: !isValidFilterListId(newFilterId)
    });
  }

  updateDescription = (description) => {
    this.setState({ description });
  }

  addItems = (itemsToAdd) => {
    this.setState((prevState) => {
      const { itemsPerPage, searchQuery } = prevState;
      const items = [...prevState.items];
      const alreadyInFilter = [];
      itemsToAdd.forEach((item) => {
        if (items.indexOf(item) === -1) {
          items.push(item);
        } else {
          alreadyInFilter.push(item);
        }
      });
      items.sort((str1, str2) => {
        return str1.localeCompare(str2);
      });

      if (alreadyInFilter.length > 0) {
        toastNotifications.addWarning(`The following items were already in the filter list: ${alreadyInFilter}`);
      }

      const matchingItems = getMatchingFilterItems(searchQuery, items);
      const activePage = getActivePage(prevState.activePage, itemsPerPage, matchingItems.length);

      return {
        items,
        matchingItems,
        activePage,
        searchQuery
      };
    });
  };

  deleteSelectedItems = () => {
    this.setState((prevState) => {
      const { selectedItems, itemsPerPage, searchQuery } = prevState;
      const items = [...prevState.items];
      selectedItems.forEach((item) => {
        const index = items.indexOf(item);
        if (index !== -1) {
          items.splice(index, 1);
        }
      });

      const matchingItems = getMatchingFilterItems(searchQuery, items);
      const activePage = getActivePage(prevState.activePage, itemsPerPage, matchingItems.length);

      return {
        items,
        matchingItems,
        selectedItems: [],
        activePage,
        searchQuery
      };
    });
  }

  onSearchChange = ({ query }) => {
    this.setState((prevState) => {
      const { items, itemsPerPage } = prevState;

      const matchingItems = getMatchingFilterItems(query, items);
      const activePage = getActivePage(prevState.activePage, itemsPerPage, matchingItems.length);

      return {
        matchingItems,
        activePage,
        searchQuery: query
      };
    });
  };

  setItemSelected = (item, isSelected) => {
    this.setState((prevState) => {
      const selectedItems = [...prevState.selectedItems];
      const index = selectedItems.indexOf(item);
      if (isSelected === true && index === -1) {
        selectedItems.push(item);
      } else if (isSelected === false && index !== -1) {
        selectedItems.splice(index, 1);
      }

      return {
        selectedItems
      };
    });
  };

  setActivePage = (activePage) => {
    this.setState({ activePage });
  }

  setItemsPerPage = (itemsPerPage) => {
    this.setState({
      itemsPerPage,
      activePage: 0
    });
  }

  save = () => {
    this.setState({ saveInProgress: true });

    const { loadedFilter, newFilterId, description, items } = this.state;
    const filterId = (this.props.filterId !== undefined) ? this.props.filterId : newFilterId;
    saveFilterList(
      filterId,
      description,
      items,
      loadedFilter
    )
      .then((savedFilter) => {
        this.setLoadedFilterState(savedFilter);
        returnToFiltersList();
      })
      .catch((resp) => {
        console.log(`Error saving filter ${filterId}:`, resp);
        toastNotifications.addDanger(`An error occurred saving filter ${filterId}`);
        this.setState({ saveInProgress: false });
      });
  }

  render() {
    const {
      loadedFilter,
      newFilterId,
      isNewFilterIdInvalid,
      description,
      items,
      matchingItems,
      selectedItems,
      itemsPerPage,
      activePage,
      saveInProgress } = this.state;

    const totalItemCount = (items !== undefined) ? items.length : 0;

    return (
      <EuiPage className="ml-edit-filter-lists">
        <EuiPageContent
          className="ml-edit-filter-lists-content"
          verticalPosition="center"
          horizontalPosition="center"
        >
          <EditFilterListHeader
            filterId={this.props.filterId}
            newFilterId={newFilterId}
            isNewFilterIdInvalid={isNewFilterIdInvalid}
            updateNewFilterId={this.updateNewFilterId}
            description={description}
            updateDescription={this.updateDescription}
            totalItemCount={totalItemCount}
            usedBy={loadedFilter.used_by}
          />
          <EditFilterListToolbar
            onSearchChange={this.onSearchChange}
            addItems={this.addItems}
            deleteSelectedItems={this.deleteSelectedItems}
            selectedItemCount={selectedItems.length}
          />
          <EuiSpacer size="xl" />
          <ItemsGrid
            totalItemCount={totalItemCount}
            items={matchingItems}
            selectedItems={selectedItems}
            itemsPerPage={itemsPerPage}
            setItemsPerPage={this.setItemsPerPage}
            setItemSelected={this.setItemSelected}
            activePage={activePage}
            setActivePage={this.setActivePage}
          />
          <EuiFlexGroup justifyContent="flexEnd">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                onClick={returnToFiltersList}
              >
                Cancel
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                onClick={this.save}
                disabled={(saveInProgress === true) || (isNewFilterIdInvalid === true)}
                fill
              >
                Save
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPageContent>
      </EuiPage>
    );
  }
}
EditFilterList.propTypes = {
  filterId: PropTypes.string
};

