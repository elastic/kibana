/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


/*
 * React table for displaying a table of filter lists.
 */

import React, {
  Component
} from 'react';

import {
  EuiPage,
  EuiPageContent,
} from '@elastic/eui';

import { toastNotifications } from 'ui/notify';

import { FilterListsHeader } from './header';
import { FilterListsTable } from './table';
import { ml } from 'plugins/ml/services/ml_api_service';


export class FilterLists extends Component {
  constructor(props) {
    super(props);

    this.state = {
      filterLists: [],
      selectedFilterLists: []
    };
  }

  componentDidMount() {
    this.refreshFilterLists();
  }

  setSelectedFilterLists = (selectedFilterLists) => {
    this.setState({ selectedFilterLists });
  }

  refreshFilterLists = () => {
    // Load the list of filters.
    ml.filters.filtersStats()
      .then((filterLists) => {
        // Check selected filter lists still exist.
        this.setState((prevState) => {
          const loadedFilterIds = filterLists.map(filterList => filterList.filter_id);
          const selectedFilterLists = prevState.selectedFilterLists.filter((filterList) => {
            return (loadedFilterIds.indexOf(filterList.filter_id) !== -1);
          });

          return {
            filterLists,
            selectedFilterLists
          };
        });
      })
      .catch((resp) => {
        console.log('Error loading list of filters:', resp);
        toastNotifications.addDanger('An error occurred loading the filter lists');
      });
  }

  render() {
    const { filterLists, selectedFilterLists } = this.state;

    return (
      <EuiPage className="ml-list-filter-lists">
        <EuiPageContent
          className="ml-list-filter-lists-content"
          verticalPosition="center"
          horizontalPosition="center"
        >
          <FilterListsHeader
            totalCount={filterLists.length}
            refreshFilterLists={this.refreshFilterLists}
          />
          <FilterListsTable
            filterLists={filterLists}
            selectedFilterLists={selectedFilterLists}
            setSelectedFilterLists={this.setSelectedFilterLists}
            refreshFilterLists={this.refreshFilterLists}
          />
        </EuiPageContent>
      </EuiPage>
    );
  }
}

