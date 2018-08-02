/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  EuiContextMenuPanel,
  EuiContextMenuItem,
  EuiFieldSearch,
  EuiButton,
  EuiText,
} from '@elastic/eui';
import { SpaceAvatar } from '../../components/space_avatar';
import { SPACE_SEARCH_COUNT_THRESHOLD } from '../../../../common/constants';
import './spaces_menu.less';

export class SpacesMenu extends Component {
  state = {
    searchTerm: '',
    allowSpacesListFocus: false,
  }

  render() {
    const {
      searchTerm
    } = this.state;

    const items = this.getVisibleSpaces(searchTerm).map(this.renderSpaceMenuItem);

    const panelProps = {
      className: 'spacesMenu',
      title: 'Change current space',
      watchedItemProps: ['data-search-term']
    };

    if (this.props.spaces.length >= SPACE_SEARCH_COUNT_THRESHOLD) {
      return (
        <EuiContextMenuPanel {...panelProps}>
          {this.renderSearchField()}
          {this.renderSpacesListPanel(items, searchTerm)}
          {this.renderManageButton()}
        </EuiContextMenuPanel>
      );
    }

    items.push(this.renderManageButton());

    return (
      <EuiContextMenuPanel
        {...panelProps}
        items={items}
      />
    );
  }

  getVisibleSpaces = (searchTerm) => {

    const {
      spaces,
    } = this.props;

    let filteredSpaces = spaces;
    if (searchTerm) {
      filteredSpaces = spaces
        .filter(space => {
          const {
            name,
            description = ''
          } = space;
          return name.toLowerCase().indexOf(searchTerm) >= 0 || (description.toLowerCase().indexOf(searchTerm) >= 0);
        });
    }

    return filteredSpaces;
  }

  renderSpacesListPanel = (items, searchTerm) => {
    if (items.length === 0) {
      return <EuiText color="subdued" textAlign="center">no spaces found</EuiText>;
    }

    return (
      <EuiContextMenuPanel
        key={`spacesMenuList`}
        data-search-term={searchTerm}
        className="spacesMenu__spacesList"
        hasFocus={this.state.allowSpacesListFocus}
        initialFocusedItemIndex={this.state.allowSpacesListFocus ? 0 : undefined}
        items={items}
      />
    );
  }

  renderSearchField = () => {
    return (
      <div className="spacesMenu__searchFieldWrapper">
        <EuiFieldSearch
          placeholder="Find a space"
          incremental={true}
          onSearch={this.onSearch}
          onKeyDown={this.onSearchKeyDown}
          onFocus={this.onSearchFocus}
          compressed
        />
      </div>
    );
  }

  onSearchKeyDown = (e) => {
    //  9: tab
    // 13: enter
    // 40: arrow-down
    const focusableKeyCodes = [9, 13, 40];

    const keyCode = e.keyCode;
    if (focusableKeyCodes.includes(keyCode)) {
      // Allows the spaces list panel to recieve focus. This enables keyboard and screen reader navigation
      this.setState({
        allowSpacesListFocus: true
      });

    }
  }

  onSearchFocus = () => {
    this.setState({
      allowSpacesListFocus: false
    });
  }

  renderManageButton = () => {
    return (
      <div className="spacesMenu__manageButtonWrapper">
        <EuiButton key="manageSpacesButton" size="s" style={{ width: `100%` }}>Manage spaces</EuiButton>
      </div>
    );
  }

  onSearch = (searchTerm) => {
    this.setState({
      searchTerm: searchTerm.trim().toLowerCase()
    });
  }

  renderSpaceMenuItem = (space) => {
    const icon = <SpaceAvatar space={space} size={'s'} />;
    return (
      <EuiContextMenuItem
        key={space.id}
        icon={icon}
        onClick={this.props.onSelectSpace.bind(this, space)}
        toolTipTitle={space.description && space.name}
        toolTipContent={space.description}
      >
        {space.name}
      </EuiContextMenuItem>
    );
  }
}

SpacesMenu.propTypes = {
  spaces: PropTypes.array.isRequired,
  onSelectSpace: PropTypes.func.isRequired,
};
