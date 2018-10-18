/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiContextMenuItem, EuiContextMenuPanel, EuiFieldSearch, EuiText } from '@elastic/eui';
import React, { Component } from 'react';
import { UserProfile } from '../../../../../xpack_main/public/services/user_profile';
import { SPACE_SEARCH_COUNT_THRESHOLD } from '../../../../common/constants';
import { Space } from '../../../../common/model/space';
import { ManageSpacesButton, SpaceAvatar } from '../../../components';
import './spaces_menu.less';

interface Props {
  spaces: Space[];
  onSelectSpace: (space: Space) => void;
  onManageSpacesClick: () => void;
  userProfile: UserProfile;
}

interface State {
  searchTerm: string;
  allowSpacesListFocus: boolean;
}

export class SpacesMenu extends Component<Props, State> {
  public state = {
    searchTerm: '',
    allowSpacesListFocus: false,
  };

  public render() {
    const { searchTerm } = this.state;

    const items = this.getVisibleSpaces(searchTerm).map(this.renderSpaceMenuItem);

    const panelProps = {
      className: 'spacesMenu',
      title: 'Change current space',
      watchedItemProps: ['data-search-term'],
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

    return <EuiContextMenuPanel {...panelProps} items={items} />;
  }

  private getVisibleSpaces = (searchTerm: string): Space[] => {
    const { spaces } = this.props;

    let filteredSpaces = spaces;
    if (searchTerm) {
      filteredSpaces = spaces.filter(space => {
        const { name, description = '' } = space;
        return (
          name.toLowerCase().indexOf(searchTerm) >= 0 ||
          description.toLowerCase().indexOf(searchTerm) >= 0
        );
      });
    }

    return filteredSpaces;
  };

  private renderSpacesListPanel = (items: JSX.Element[], searchTerm: string) => {
    if (items.length === 0) {
      return (
        <EuiText color="subdued" className="eui-textCenter">
          {' '}
          no spaces found{' '}
        </EuiText>
      );
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
  };

  private renderSearchField = () => {
    return (
      <div key="manageSpacesSearchField" className="spacesMenu__searchFieldWrapper">
        <EuiFieldSearch
          placeholder="Find a space"
          incremental={true}
          // FIXME needs updated typedef
          // @ts-ignore
          onSearch={this.onSearch}
          onKeyDown={this.onSearchKeyDown}
          onFocus={this.onSearchFocus}
          compressed
        />
      </div>
    );
  };

  private onSearchKeyDown = (e: any) => {
    //  9: tab
    // 13: enter
    // 40: arrow-down
    const focusableKeyCodes = [9, 13, 40];

    const keyCode = e.keyCode;
    if (focusableKeyCodes.includes(keyCode)) {
      // Allows the spaces list panel to recieve focus. This enables keyboard and screen reader navigation
      this.setState({
        allowSpacesListFocus: true,
      });
    }
  };

  private onSearchFocus = () => {
    this.setState({
      allowSpacesListFocus: false,
    });
  };

  private renderManageButton = () => {
    return (
      <div key="manageSpacesButton" className="spacesMenu__manageButtonWrapper">
        <ManageSpacesButton
          size="s"
          style={{ width: `100%` }}
          userProfile={this.props.userProfile}
          onClick={this.props.onManageSpacesClick}
        />
      </div>
    );
  };

  private onSearch = (searchTerm: string) => {
    this.setState({
      searchTerm: searchTerm.trim().toLowerCase(),
    });
  };

  private renderSpaceMenuItem = (space: Space): JSX.Element => {
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
  };
}
