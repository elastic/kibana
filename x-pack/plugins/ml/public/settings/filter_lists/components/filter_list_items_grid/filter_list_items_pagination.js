/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


/*
 * React component for the pagination controls of the filter list items grid.
 */

import PropTypes from 'prop-types';
import React, {
  Component,
} from 'react';

import {
  EuiButtonEmpty,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPagination,
  EuiPopover,
} from '@elastic/eui';


function getContextMenuItemIcon(menuItemSetting, itemsPerPage) {
  return (menuItemSetting === itemsPerPage) ? 'check' : 'empty';
}


export class FilterListItemsPagination extends Component {

  constructor(props) {
    super(props);

    this.state = {
      isPopoverOpen: false
    };
  }

  onButtonClick = () => {
    this.setState({
      isPopoverOpen: !this.state.isPopoverOpen,
    });
  }

  closePopover = () => {
    this.setState({
      isPopoverOpen: false,
    });
  }

  onPageClick = (pageNumber) => {
    this.props.setActivePage(pageNumber);
  }

  onChangeItemsPerPage = (pageSize) => {
    this.closePopover();
    this.props.setItemsPerPage(pageSize);
  }

  render() {

    const {
      itemCount,
      itemsPerPage,
      activePage } = this.props;

    const button = (
      <EuiButtonEmpty
        size="s"
        color="text"
        iconType="arrowDown"
        iconSide="right"
        onClick={this.onButtonClick}
      >
        Items per page: {itemsPerPage}
      </EuiButtonEmpty>
    );

    const pageCount = Math.ceil(itemCount / itemsPerPage);

    const items = [
      (
        <EuiContextMenuItem
          key="50 items"
          icon={getContextMenuItemIcon(50, itemsPerPage)}
          onClick={() => {this.onChangeItemsPerPage(50);}}
        >
          50 items
        </EuiContextMenuItem>
      ), (
        <EuiContextMenuItem
          key="100 items"
          icon={getContextMenuItemIcon(100, itemsPerPage)}
          onClick={() => {this.onChangeItemsPerPage(100);}}
        >
          100 items
        </EuiContextMenuItem>
      ), (
        <EuiContextMenuItem
          key="500 items"
          icon={getContextMenuItemIcon(500, itemsPerPage)}
          onClick={() => {this.onChangeItemsPerPage(500);}}
        >
          500 items
        </EuiContextMenuItem>
      ), (
        <EuiContextMenuItem
          key="1000 items"
          icon={getContextMenuItemIcon(1000, itemsPerPage)}
          onClick={() => {this.onChangeItemsPerPage(1000);}}
        >
          1000 items
        </EuiContextMenuItem>
      ),
    ];

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
            <EuiContextMenuPanel
              items={items}
              className="ml-filter-item-page-size"
            />
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
FilterListItemsPagination.propTypes = {
  itemCount: PropTypes.number.isRequired,
  itemsPerPage: PropTypes.number.isRequired,
  setItemsPerPage: PropTypes.func.isRequired,
  activePage: PropTypes.number.isRequired,
  setActivePage: PropTypes.func.isRequired
};

