/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { toQuery, fromQuery, history } from '../../../../utils/url';
import { debounce } from 'lodash';
import APMTable, {
  AlignmentKuiTableHeaderCell
} from '../../../shared/APMTable/APMTable';
import ListItem from './ListItem';

const ITEMS_PER_PAGE = 20;
class List extends Component {
  updateQuery = getNextQuery => {
    const { location } = this.props;
    const prevQuery = toQuery(location.search);

    history.push({
      ...location,
      search: fromQuery(getNextQuery(prevQuery))
    });
  };

  onClickNext = () => {
    const { page } = this.props.urlParams;
    this.updateQuery(prevQuery => ({
      ...prevQuery,
      page: page + 1
    }));
  };

  onClickPrev = () => {
    const { page } = this.props.urlParams;
    this.updateQuery(prevQuery => ({
      ...prevQuery,
      page: page - 1
    }));
  };

  onFilter = debounce(q => {
    this.updateQuery(prevQuery => ({
      ...prevQuery,
      page: 0,
      q
    }));
  }, 300);

  onSort = key => {
    this.updateQuery(prevQuery => ({
      ...prevQuery,
      sortBy: key,
      sortOrder: this.props.urlParams.sortOrder === 'asc' ? 'desc' : 'asc'
    }));
  };

  render() {
    const { items } = this.props;
    const {
      sortBy = 'latestOccurrenceAt',
      sortOrder = 'desc',
      page,
      serviceName
    } = this.props.urlParams;

    const renderHead = () => {
      const cells = [
        { key: 'groupId', sortable: false, label: 'Group ID' },
        { key: 'message', sortable: false, label: 'Error message and culprit' },
        { key: 'handled', sortable: false, label: '', alignRight: true },
        {
          key: 'occurrenceCount',
          sortable: true,
          label: 'Occurrences',
          alignRight: true
        },
        {
          key: 'latestOccurrenceAt',
          sortable: true,
          label: 'Latest occurrence',
          alignRight: true
        }
      ].map(({ key, sortable, label, alignRight }) => (
        <AlignmentKuiTableHeaderCell
          key={key}
          className={alignRight ? 'kuiTableHeaderCell--alignRight' : ''}
          {...(sortable
            ? {
                onSort: () => this.onSort(key),
                isSorted: sortBy === key,
                isSortAscending: sortOrder === 'asc'
              }
            : {})}
        >
          {label}
        </AlignmentKuiTableHeaderCell>
      ));

      return cells;
    };

    const renderBody = errorGroups => {
      return errorGroups.map(error => {
        return (
          <ListItem
            key={error.groupId}
            serviceName={serviceName}
            error={error}
          />
        );
      });
    };

    const startNumber = page * ITEMS_PER_PAGE;
    const endNumber = (page + 1) * ITEMS_PER_PAGE;
    const currentPageItems = items.slice(startNumber, endNumber);

    return (
      <APMTable
        defaultSearchQuery={this.props.urlParams.q}
        emptyMessageHeading="No errors in the selected time range."
        items={currentPageItems}
        itemsPerPage={ITEMS_PER_PAGE}
        onClickNext={this.onClickNext}
        onClickPrev={this.onClickPrev}
        onFilter={this.onFilter}
        page={page}
        renderBody={renderBody}
        renderHead={renderHead}
        totalItems={items.length}
      />
    );
  }
}

List.propTypes = {
  location: PropTypes.object.isRequired
};

export default List;
