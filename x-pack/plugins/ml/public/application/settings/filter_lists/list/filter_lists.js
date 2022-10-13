/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * React table for displaying a table of filter lists.
 */

import React, { Component } from 'react';
import { PropTypes } from 'prop-types';

import { i18n } from '@kbn/i18n';

import { withKibana } from '@kbn/kibana-react-plugin/public';

import { FilterListsHeader } from './header';
import { FilterListsTable } from './table';
import { ml } from '../../../services/ml_api_service';

import { getDocLinks } from '../../../util/dependency_cache';
import { HelpMenu } from '../../../components/help_menu';

export class FilterListsUI extends Component {
  static displayName = 'FilterLists';
  static propTypes = {
    canCreateFilter: PropTypes.bool.isRequired,
    canDeleteFilter: PropTypes.bool.isRequired,
  };

  constructor(props) {
    super(props);

    this.state = {
      filterLists: [],
      selectedFilterLists: [],
    };
  }

  componentDidMount() {
    this.refreshFilterLists();
  }

  setFilterLists = (filterLists) => {
    // Check selected filter lists still exist.
    this.setState((prevState) => {
      const loadedFilterIds = filterLists.map((filterList) => filterList.filter_id);
      const selectedFilterLists = prevState.selectedFilterLists.filter((filterList) => {
        return loadedFilterIds.indexOf(filterList.filter_id) !== -1;
      });

      return {
        filterLists,
        selectedFilterLists,
      };
    });
  };

  setSelectedFilterLists = (selectedFilterLists) => {
    this.setState({ selectedFilterLists });
  };

  refreshFilterLists = () => {
    // Load the list of filters.
    ml.filters
      .filtersStats()
      .then((filterLists) => {
        this.setFilterLists(filterLists);
      })
      .catch((resp) => {
        console.log('Error loading list of filters:', resp);
        const { toasts } = this.props.kibana.services.notifications;
        toasts.addDanger(
          i18n.translate(
            'xpack.ml.settings.filterLists.filterLists.loadingFilterListsErrorMessage',
            {
              defaultMessage: 'An error occurred loading the filter lists',
            }
          )
        );
      });
  };

  render() {
    const { filterLists, selectedFilterLists } = this.state;
    const { canCreateFilter, canDeleteFilter } = this.props;
    const helpLink = getDocLinks().links.ml.customRules;

    return (
      <>
        <div data-test-subj="mlPageFilterListManagement">
          <FilterListsHeader
            totalCount={filterLists.length}
            refreshFilterLists={this.refreshFilterLists}
          />
          <FilterListsTable
            canCreateFilter={canCreateFilter}
            canDeleteFilter={canDeleteFilter}
            filterLists={filterLists}
            selectedFilterLists={selectedFilterLists}
            setSelectedFilterLists={this.setSelectedFilterLists}
            refreshFilterLists={this.refreshFilterLists}
          />
        </div>
        <HelpMenu docLink={helpLink} />
      </>
    );
  }
}
export const FilterLists = withKibana(FilterListsUI);
