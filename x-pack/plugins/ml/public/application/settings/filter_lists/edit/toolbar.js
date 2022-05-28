/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * React component for the toolbar section of the edit filter list page,
 * holding a search bar, and buttons for adding and deleting items from the list.
 */

import PropTypes from 'prop-types';
import React from 'react';

import { FormattedMessage } from '@kbn/i18n-react';

import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiSearchBar } from '@elastic/eui';

import { AddItemPopover } from '../components/add_item_popover';

function renderToolsRight(
  canCreateFilter,
  canDeleteFilter,
  addItems,
  deleteSelectedItems,
  selectedItemCount
) {
  return [
    <AddItemPopover addItems={addItems} canCreateFilter={canCreateFilter} key="add_item_btn" />,
    <EuiButton
      color="danger"
      size="s"
      disabled={selectedItemCount === 0 || canDeleteFilter === false}
      onClick={deleteSelectedItems}
      key="delete_item_btn"
      data-test-subj="mlFilterListDeleteItemButton"
    >
      <FormattedMessage
        id="xpack.ml.settings.filterLists.toolbar.deleteItemButtonLabel"
        defaultMessage="Delete item"
      />
    </EuiButton>,
  ];
}

export function EditFilterListToolbar({
  canCreateFilter,
  canDeleteFilter,
  onSearchChange,
  addItems,
  deleteSelectedItems,
  selectedItemCount,
}) {
  const toolsRight = renderToolsRight(
    canCreateFilter,
    canDeleteFilter,
    addItems,
    deleteSelectedItems,
    selectedItemCount
  );

  return (
    <React.Fragment>
      <EuiFlexGroup alignItems="center" gutterSize="xl">
        <EuiFlexItem>
          <EuiSearchBar toolsRight={toolsRight} onChange={onSearchChange} filters={[]} />
        </EuiFlexItem>
      </EuiFlexGroup>
    </React.Fragment>
  );
}
EditFilterListToolbar.propTypes = {
  canCreateFilter: PropTypes.bool.isRequired,
  canDeleteFilter: PropTypes.bool.isRequired,
  onSearchChange: PropTypes.func.isRequired,
  addItems: PropTypes.func.isRequired,
  deleteSelectedItems: PropTypes.func.isRequired,
  selectedItemCount: PropTypes.number.isRequired,
};
