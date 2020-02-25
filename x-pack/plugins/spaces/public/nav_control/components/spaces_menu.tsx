/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFieldSearch,
  EuiText,
  EuiLoadingContent,
} from '@elastic/eui';
import { FormattedMessage, InjectedIntl, injectI18n } from '@kbn/i18n/react';
import React, { Component, ReactElement } from 'react';
import { Capabilities, ApplicationStart } from 'src/core/public';
import { SPACE_SEARCH_COUNT_THRESHOLD } from '../../../common/constants';
import { Space } from '../../../common/model/space';
import { ManageSpacesButton } from './manage_spaces_button';
import { SpaceAvatar } from '../../space_avatar';

interface Props {
  id: string;
  spaces: Space[];
  isLoading: boolean;
  onSelectSpace: (space: Space) => void;
  onManageSpacesClick: () => void;
  intl: InjectedIntl;
  capabilities: Capabilities;
  navigateToApp: ApplicationStart['navigateToApp'];
}

interface State {
  searchTerm: string;
  allowSpacesListFocus: boolean;
}

class SpacesMenuUI extends Component<Props, State> {
  public state = {
    searchTerm: '',
    allowSpacesListFocus: false,
  };

  public render() {
    const { intl, isLoading } = this.props;
    const { searchTerm } = this.state;

    const items = isLoading
      ? [1, 2, 3].map(this.renderPlaceholderMenuItem)
      : this.getVisibleSpaces(searchTerm).map(this.renderSpaceMenuItem);

    const panelProps = {
      id: this.props.id,
      className: 'spcMenu',
      title: intl.formatMessage({
        id: 'xpack.spaces.navControl.spacesMenu.changeCurrentSpaceTitle',
        defaultMessage: 'Change current space',
      }),
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

  private renderSpacesListPanel = (items: ReactElement[], searchTerm: string) => {
    if (items.length === 0) {
      return (
        <EuiText color="subdued" className="eui-textCenter">
          <FormattedMessage
            id="xpack.spaces.navControl.spacesMenu.noSpacesFoundTitle"
            defaultMessage=" no spaces found "
          />
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
    const { intl } = this.props;
    return (
      <div key="manageSpacesSearchField" className="spcMenu__searchFieldWrapper">
        {
          // @ts-ignore
          <EuiFieldSearch
            placeholder={intl.formatMessage({
              id: 'xpack.spaces.navControl.spacesMenu.findSpacePlaceholder',
              defaultMessage: 'Find a space',
            })}
            incremental={true}
            // FIXME needs updated typedef
            onSearch={this.onSearch}
            onKeyDown={this.onSearchKeyDown}
            onFocus={this.onSearchFocus}
            compressed
          />
        }
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
        onClick={this.props.onManageSpacesClick}
        capabilities={this.props.capabilities}
        navigateToApp={this.props.navigateToApp}
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

  private renderPlaceholderMenuItem = (key: string | number): JSX.Element => {
    return (
      <EuiContextMenuItem key={key} disabled={true}>
        <EuiLoadingContent lines={1} />
      </EuiContextMenuItem>
    );
  };
}

export const SpacesMenu = injectI18n(SpacesMenuUI);
