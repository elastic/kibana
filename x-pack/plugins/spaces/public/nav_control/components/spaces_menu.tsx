/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './spaces_menu.scss';

import {
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFieldSearch,
  EuiLoadingContent,
  EuiLoadingSpinner,
  EuiText,
} from '@elastic/eui';
import type { ReactElement } from 'react';
import React, { Component, lazy, Suspense } from 'react';

import type { ApplicationStart, Capabilities } from '@kbn/core/public';
import type { InjectedIntl } from '@kbn/i18n-react';
import { FormattedMessage, injectI18n } from '@kbn/i18n-react';

import type { Space } from '../../../common';
import { addSpaceIdToPath, ENTER_SPACE_PATH, SPACE_SEARCH_COUNT_THRESHOLD } from '../../../common';
import { getSpaceAvatarComponent } from '../../space_avatar';
import { ManageSpacesButton } from './manage_spaces_button';

// No need to wrap LazySpaceAvatar in an error boundary, because it is one of the first chunks loaded when opening Kibana.
const LazySpaceAvatar = lazy(() =>
  getSpaceAvatarComponent().then((component) => ({ default: component }))
);

interface Props {
  id: string;
  spaces: Space[];
  isLoading: boolean;
  serverBasePath: string;
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
      filteredSpaces = spaces.filter((space) => {
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
          <EuiFieldSearch
            placeholder={intl.formatMessage({
              id: 'xpack.spaces.navControl.spacesMenu.findSpacePlaceholder',
              defaultMessage: 'Find a space',
            })}
            incremental={true}
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
      // Allows the spaces list panel to receive focus. This enables keyboard and screen reader navigation
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
    const icon = (
      <Suspense fallback={<EuiLoadingSpinner />}>
        <LazySpaceAvatar space={space} size={'s'} />
      </Suspense>
    );
    return (
      <EuiContextMenuItem
        key={space.id}
        data-test-subj={`${space.id}-gotoSpace`}
        icon={icon}
        href={addSpaceIdToPath(this.props.serverBasePath, space.id, ENTER_SPACE_PATH)}
        toolTipTitle={space.description && space.name}
        toolTipContent={space.description}
      >
        <EuiText className="spcMenu__item">{space.name}</EuiText>
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
