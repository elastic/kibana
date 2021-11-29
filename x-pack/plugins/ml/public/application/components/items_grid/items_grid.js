/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * React component for a paged grid of items.
 */

import PropTypes from 'prop-types';
import React from 'react';

import { EuiCheckbox, EuiFlexGrid, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';

import { ItemsGridPagination } from './items_grid_pagination';

import { FormattedMessage } from '@kbn/i18n-react';

export function ItemsGrid({
  numberColumns,
  totalItemCount,
  items,
  selectedItems,
  itemsPerPage,
  itemsPerPageOptions,
  setItemsPerPage,
  setItemSelected,
  activePage,
  setActivePage,
}) {
  if (items === undefined || items.length === 0) {
    return (
      <EuiFlexGroup justifyContent="spaceAround">
        <EuiFlexItem grow={false}>
          <EuiText>
            <h4>
              {totalItemCount === 0 ? (
                <FormattedMessage
                  id="xpack.ml.itemsGrid.noItemsAddedTitle"
                  defaultMessage="No items have been added"
                />
              ) : (
                <FormattedMessage
                  id="xpack.ml.itemsGrid.noMatchingItemsTitle"
                  defaultMessage="No matching items"
                />
              )}
            </h4>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  const startIndex = activePage * itemsPerPage;
  const pageItems = items.slice(startIndex, startIndex + itemsPerPage);
  const gridItems = pageItems.map((item, index) => {
    return (
      <EuiFlexItem key={`ml_grid_item_${index}`} data-test-subj={`mlGridItem ${item}`}>
        <EuiCheckbox
          id={`ml_grid_item_${index}`}
          label={item}
          checked={selectedItems.indexOf(item) >= 0}
          onChange={(e) => {
            setItemSelected(item, e.target.checked);
          }}
          data-test-subj={`mlGridItemCheckbox`}
        />
      </EuiFlexItem>
    );
  });

  return (
    <div>
      <EuiFlexGrid columns={numberColumns} className="eui-textBreakWord" gutterSize="m">
        {gridItems}
      </EuiFlexGrid>
      <ItemsGridPagination
        itemCount={items.length}
        itemsPerPage={itemsPerPage}
        itemsPerPageOptions={itemsPerPageOptions}
        setItemsPerPage={setItemsPerPage}
        activePage={activePage}
        setActivePage={setActivePage}
      />
    </div>
  );
}
ItemsGrid.propTypes = {
  numberColumns: PropTypes.oneOf([2, 3, 4]), // In line with EuiFlexGrid which supports 2, 3 or 4 columns.
  totalItemCount: PropTypes.number.isRequired,
  items: PropTypes.array,
  selectedItems: PropTypes.array,
  itemsPerPage: PropTypes.number,
  itemsPerPageOptions: PropTypes.arrayOf(PropTypes.number),
  setItemsPerPage: PropTypes.func.isRequired,
  setItemSelected: PropTypes.func.isRequired,
  activePage: PropTypes.number.isRequired,
  setActivePage: PropTypes.func.isRequired,
};

ItemsGrid.defaultProps = {
  numberColumns: 4,
  itemsPerPage: 50,
  itemsPerPageOptions: [50, 100, 500, 1000],
};
