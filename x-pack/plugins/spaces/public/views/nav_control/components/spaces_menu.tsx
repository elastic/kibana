/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiContextMenuItem, EuiContextMenuPanel, EuiFieldSearch, EuiText } from '@elastic/eui';
<<<<<<< HEAD
=======
import { FormattedMessage, InjectedIntl, injectI18n } from '@kbn/i18n/react';
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
import React, { Component } from 'react';
import { UserProfile } from '../../../../../xpack_main/public/services/user_profile';
import { SPACE_SEARCH_COUNT_THRESHOLD } from '../../../../common/constants';
import { Space } from '../../../../common/model/space';
import { ManageSpacesButton, SpaceAvatar } from '../../../components';

interface Props {
  spaces: Space[];
  onSelectSpace: (space: Space) => void;
  onManageSpacesClick: () => void;
  userProfile: UserProfile;
<<<<<<< HEAD
=======
  intl: InjectedIntl;
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
}

interface State {
  searchTerm: string;
  allowSpacesListFocus: boolean;
}

<<<<<<< HEAD
export class SpacesMenu extends Component<Props, State> {
=======
class SpacesMenuUI extends Component<Props, State> {
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
  public state = {
    searchTerm: '',
    allowSpacesListFocus: false,
  };

  public render() {
<<<<<<< HEAD
=======
    const { intl } = this.props;
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
    const { searchTerm } = this.state;

    const items = this.getVisibleSpaces(searchTerm).map(this.renderSpaceMenuItem);

    const panelProps = {
      className: 'spcMenu',
<<<<<<< HEAD
      title: 'Change current space',
=======
      title: intl.formatMessage({
        id: 'xpack.spaces.navControl.spacesMenu.changeCurrentSpaceTitle',
        defaultMessage: 'Change current space',
      }),
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
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
<<<<<<< HEAD
          {' '}
          no spaces found{' '}
=======
          <FormattedMessage
            id="xpack.spaces.navControl.spacesMenu.noSpacesFoundTitle"
            defaultMessage=" no spaces found "
          />
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
        </EuiText>
      );
    }

    return (
      <EuiContextMenuPanel
        key={`spcMenuList`}
        data-search-term={searchTerm}
        className="spcMenu__spacesList"
        hasFocus={this.state.allowSpacesListFocus}
        initialFocusedItemIndex={this.state.allowSpacesListFocus ? 0 : undefined}
        items={items}
      />
    );
  };

  private renderSearchField = () => {
<<<<<<< HEAD
    return (
      <div key="manageSpacesSearchField" className="spcMenu__searchFieldWrapper">
        <EuiFieldSearch
          placeholder="Find a space"
=======
    const { intl } = this.props;
    return (
      <div key="manageSpacesSearchField" className="spcMenu__searchFieldWrapper">
        <EuiFieldSearch
          placeholder={intl.formatMessage({
            id: 'xpack.spaces.navControl.spacesMenu.findSpacePlaceholder',
            defaultMessage: 'Find a space',
          })}
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
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
      <ManageSpacesButton
        key="manageSpacesButton"
        className="spcMenu__manageButton"
        size="s"
        userProfile={this.props.userProfile}
        onClick={this.props.onManageSpacesClick}
      />
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
<<<<<<< HEAD
=======

export const SpacesMenu = injectI18n(SpacesMenuUI);
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
