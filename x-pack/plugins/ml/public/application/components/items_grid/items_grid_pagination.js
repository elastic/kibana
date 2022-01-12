/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * React component for the pagination controls of the items grid.
 */

import PropTypes from 'prop-types';
import React, { Component } from 'react';

import {
  EuiButtonEmpty,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPagination,
  EuiPopover,
} from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n-react';

function getContextMenuItemIcon(menuItemSetting, itemsPerPage) {
  return menuItemSetting === itemsPerPage ? 'check' : 'empty';
}

export class ItemsGridPagination extends Component {
  constructor(props) {
    super(props);

    this.state = {
      isPopoverOpen: false,
    };
  }

  onButtonClick = () => {
    this.setState({
      isPopoverOpen: !this.state.isPopoverOpen,
    });
  };

  closePopover = () => {
    this.setState({
      isPopoverOpen: false,
    });
  };

  onPageClick = (pageNumber) => {
    this.props.setActivePage(pageNumber);
  };

  onChangeItemsPerPage = (pageSize) => {
    this.closePopover();
    this.props.setItemsPerPage(pageSize);
  };

  render() {
    const { itemCount, itemsPerPage, itemsPerPageOptions, activePage } = this.props;

    const button = (
      <EuiButtonEmpty
        size="s"
        color="text"
        iconType="arrowDown"
        iconSide="right"
        onClick={this.onButtonClick}
      >
        <FormattedMessage
          id="xpack.ml.itemsGrid.itemsPerPageButtonLabel"
          defaultMessage="Items per page: {itemsPerPage}"
          values={{ itemsPerPage }}
        />
      </EuiButtonEmpty>
    );

    const pageCount = Math.ceil(itemCount / itemsPerPage);

    const items = itemsPerPageOptions.map((pageSize) => {
      return (
        <EuiContextMenuItem
          key={`${pageSize} items`}
          icon={getContextMenuItemIcon(pageSize, itemsPerPage)}
          onClick={() => {
            this.onChangeItemsPerPage(pageSize);
          }}
        >
          <FormattedMessage
            id="xpack.ml.itemsGrid.itemsCountLabel"
            defaultMessage="{pageSize} items"
            values={{ pageSize }}
          />
        </EuiContextMenuItem>
      );
    });

    return (
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiPopover
            id="customizablePagination"
            button={button}
            isOpen={this.state.isPopoverOpen}
            closePopover={this.closePopover}
            panelPaddingSize="none"
          >
            <EuiContextMenuPanel items={items} className="ml-items-grid-page-size-menu" />
          </EuiPopover>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiPagination
            pageCount={pageCount}
            activePage={activePage}
            onPageClick={this.onPageClick}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
}
ItemsGridPagination.propTypes = {
  itemCount: PropTypes.number.isRequired,
  itemsPerPage: PropTypes.number.isRequired,
  itemsPerPageOptions: PropTypes.arrayOf(PropTypes.number).isRequired,
  setItemsPerPage: PropTypes.func.isRequired,
  activePage: PropTypes.number.isRequired,
  setActivePage: PropTypes.func.isRequired,
};
