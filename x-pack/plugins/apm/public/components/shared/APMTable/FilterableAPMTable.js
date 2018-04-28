/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import APMTable from './APMTable';

const ITEMS_PER_PAGE = 20;
class FilterableAPMTable extends Component {
  state = { searchQuery: '', page: 0 };

  onFilter = searchQuery => {
    this.setState({ searchQuery, page: 0 });
  };

  onClickNext = () => {
    this.setState(state => ({
      page: state.page + 1
    }));
  };

  onClickPrev = () => {
    this.setState(state => ({
      page: state.page - 1
    }));
  };

  render() {
    const {
      emptyMessageHeading,
      emptyMessageSubHeading,
      items,
      renderBody,
      renderFooterText,
      renderHead,
      searchableFields
    } = this.props;

    const startNumber = this.state.page * ITEMS_PER_PAGE;
    const endNumber = (this.state.page + 1) * ITEMS_PER_PAGE;
    const filteredItems = items.filter(item => {
      const isEmpty = this.state.searchQuery === '';
      const isMatch = searchableFields.some(property => {
        return (
          item[property] &&
          item[property]
            .toLowerCase()
            .includes(this.state.searchQuery.toLowerCase())
        );
      });
      return isEmpty || isMatch;
    });

    const currentPageItems = filteredItems.slice(startNumber, endNumber);

    return (
      <APMTable
        emptyMessageHeading={emptyMessageHeading}
        emptyMessageSubHeading={emptyMessageSubHeading}
        items={currentPageItems}
        itemsPerPage={ITEMS_PER_PAGE}
        onClickNext={this.onClickNext}
        onClickPrev={this.onClickPrev}
        onFilter={this.onFilter}
        inputPlaceholder="Filter..."
        page={this.state.page}
        renderBody={renderBody}
        renderHead={renderHead}
        renderFooterText={renderFooterText}
        totalItems={items.length}
      />
    );
  }
}

FilterableAPMTable.propTypes = {
  emptyMessageHeading: PropTypes.string,
  items: PropTypes.array,
  renderBody: PropTypes.func.isRequired,
  renderFooterText: PropTypes.func,
  renderHead: PropTypes.func.isRequired,
  searchableFields: PropTypes.array
};

FilterableAPMTable.defaultProps = {
  searchableFields: [],
  items: [],
  renderFooterText: () => {}
};

export default FilterableAPMTable;
