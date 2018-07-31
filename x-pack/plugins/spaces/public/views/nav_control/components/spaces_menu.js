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
} from '@elastic/eui';
import { SpaceAvatar } from '../../components/space_avatar';
import { SPACE_SEARCH_COUNT_THRESHOLD } from '../../../../common/constants';
import './spaces_menu.less';

export class SpacesMenu extends Component {
  state = {
    searchTerm: ''
  }

  render() {
    const {
      searchTerm
    } = this.state;

    let items = this.getVisibleSpaces(searchTerm).map(this.renderSpaceMenuItem);

    if (this.props.spaces.length >= SPACE_SEARCH_COUNT_THRESHOLD) {
      items = [this.renderSearchField(), this.renderSpacesListPanel(items, searchTerm)];
    }

    items.push(this.renderManageButton());

    return (
      <EuiContextMenuPanel
        className="spacesMenu"
        title={'Change current space'}
        watchedItemProps={['data-search-term']}
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
    return (
      <EuiContextMenuPanel
        key={`spacesMenuList`}
        data-search-term={searchTerm}
        className="spacesMenu__spacesList"
        items={items}
      />
    );
  }

  renderSearchField = () => {
    return (
      <EuiContextMenuItem key="spacesMenuSearchField">
        <EuiFieldSearch
          className="spacesMenu__searchField"
          placeholder="Find a space"
          incremental={true}
          onSearch={this.onSearch}
          compressed
        />
      </EuiContextMenuItem>
    );
  }

  renderManageButton = () => {
    return (
      <EuiContextMenuItem>
        <EuiButton size="s" style={{ width: `100%` }}>Manage spaces</EuiButton>
      </EuiContextMenuItem>
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
