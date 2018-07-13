/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


/*
 * React component for the paged grid of filter list items.
 */

import PropTypes from 'prop-types';
import React from 'react';

import {
  EuiCheckbox,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText
} from '@elastic/eui';

import { FilterListItemsPagination } from './filter_list_items_pagination';

const NUMBER_COLUMNS = 4;

export function FilterListItemsGrid({
  totalItemCount,
  items,
  selectedItems,
  itemsPerPage,
  setItemsPerPage,
  setItemSelected,
  activePage,
  setActivePage }) {

  if (items === undefined || items.length === 0) {
    return (
      <EuiFlexGroup justifyContent="spaceAround">
        <EuiFlexItem grow={false}>
          <EuiText>
            <h4>{(totalItemCount === 0) ? 'No items have been added to the filter list' : 'No matching items'}</h4>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  const startIndex = activePage * itemsPerPage;
  const pageItems = items.slice(startIndex, startIndex + itemsPerPage);
  const gridItems = pageItems.map((item, index) => {
    return (
      <EuiFlexItem key={`filter_item_${index}`}>
        <EuiCheckbox
          key={`filter_item_${index}`}
          id={`filter_item_${index}`}
          label={item}
          checked={(selectedItems.indexOf(item) >= 0)}
          onChange={(e) => { setItemSelected(item, e.target.checked); }}
        />
      </EuiFlexItem>
    );
  });

  return (
    <div>
      <EuiFlexGrid
        columns={NUMBER_COLUMNS}
        className="eui-textBreakWord"
        gutterSize="m"
      >
        {gridItems}
      </EuiFlexGrid>
      <FilterListItemsPagination
        itemCount={items.length}
        itemsPerPage={itemsPerPage}
        setItemsPerPage={setItemsPerPage}
        activePage={activePage}
        setActivePage={setActivePage}
      />
    </div>
  );

}
FilterListItemsGrid.propTypes = {
  totalItemCount: PropTypes.number.isRequired,
  items: PropTypes.array,
  selectedItems: PropTypes.array,
  itemsPerPage: PropTypes.number.isRequired,
  setItemsPerPage: PropTypes.func.isRequired,
  setItemSelected: PropTypes.func.isRequired,
  activePage: PropTypes.number.isRequired,
  setActivePage: PropTypes.func.isRequired
};
