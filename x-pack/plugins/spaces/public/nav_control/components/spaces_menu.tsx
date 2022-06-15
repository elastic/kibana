/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './spaces_menu.scss';

import { EuiAvatar, EuiPopoverFooter, EuiPopoverTitle, EuiSelectable } from '@elastic/eui';
import type { EuiSelectableOptionCheckedType } from '@elastic/eui/src/components/selectable/selectable_option';
import React, { Component } from 'react';

import type { ApplicationStart, Capabilities } from '@kbn/core/public';
import type { InjectedIntl } from '@kbn/i18n-react';
import { injectI18n } from '@kbn/i18n-react';

import type { Space } from '../../../common';
import { addSpaceIdToPath, ENTER_SPACE_PATH, SPACE_SEARCH_COUNT_THRESHOLD } from '../../../common';
import { ManageSpacesButton } from './manage_spaces_button';

// No need to wrap LazySpaceAvatar in an error boundary, because it is one of the first chunks loaded when opening Kibana.
// const LazySpaceAvatar = lazy(() =>
//   getSpaceAvatarComponent().then((component) => ({ default: component }))
// );

interface Props {
  id: string;
  spaces: Space[];
  isLoading: boolean;
  serverBasePath: string;
  onManageSpacesClick: () => void;
  intl: InjectedIntl;
  capabilities: Capabilities;
  navigateToApp: ApplicationStart['navigateToApp'];
  navigateToUrl: ApplicationStart['navigateToUrl'];
}

interface State {
  // selectedSpace: Space;
  searchTerm: string;
  allowSpacesListFocus: boolean;
}

/**
 * Selectable Space Item for display and navigation purposes.
 */
interface SelectableSpaceItem {
  label: string;
  key: string;
  prepend: JSX.Element;
  checked: EuiSelectableOptionCheckedType;
  'data-test-subj': string;
  className: string;
}

class SpacesMenuUI extends Component<Props, State> {
  // ToDo: removed unused state members
  public state = {
    // selectedSpace: this.props.spaces[0],
    searchTerm: '',
    allowSpacesListFocus: false,
  };

  public render() {
    const { intl, isLoading, spaces, serverBasePath, navigateToUrl } = this.props;
    // const { searchTerm } = this.state;

    // ToDo: how to clean this up into functions/members?
    const spaceItems: SelectableSpaceItem[] = isLoading
      ? [
          {
            label: '',
            key: '',
            prepend: <></>,
            checked: 'off',
            'data-test-subj': '',
            className: 'selectable-space-item',
          },
        ]
      : // this.getVisibleSpaces(searchTerm).map((space) => {
        spaces.map((space) => {
          return {
            label: space.name,
            key: space.id,
            prepend: (
              <EuiAvatar
                type="space"
                name={space.name}
                size="s"
                color={space.color}
                imageUrl={space.imageUrl ?? ''}
              />
            ),
            checked: 'off', // ToDo: set 'on' if this space ID matches the one we're in?
            'data-test-subj': `${space.id}-selectableSpaceItem`,
            className: 'selectableSpaceItem',
          };
        });

    const onChange = (newItems: SelectableSpaceItem[]) => {
      newItems.forEach((element: { label: any; checked: any }) => {
        console.log(`**** ${element.label}, Checked: ${element.checked}`);
      });
      const selectedSpaceItem = newItems.filter((item) => item.checked?.includes('on'))[0];

      if (!!selectedSpaceItem) {
        // selectedSpaceItem.checked = 'off';
        // const selectedSpace = spaces.filter((space) => selectedSpaceItem.label === space.name)[0];

        // ToDo: handle options (middle click or cmd/ctrl (new tab), shift click (new window))
        const urlToSelectedSpace = addSpaceIdToPath(
          serverBasePath,
          selectedSpaceItem.key, // selectedSpace.id
          ENTER_SPACE_PATH
        );
        // // Force full page reload (usually not a good idea, but we need to in order to change spaces)
        navigateToUrl(urlToSelectedSpace);
      }
    };

    const panelProps = {
      id: this.props.id,
      className: 'spcMenu',
      title: intl.formatMessage({
        id: 'xpack.spaces.navControl.spacesMenu.changeCurrentSpaceTitle',
        defaultMessage: 'Change current space',
      }),
    };

    return (
      <EuiSelectable
        {...panelProps}
        searchable={this.props.spaces.length >= SPACE_SEARCH_COUNT_THRESHOLD}
        // ToDo: I had to comment this out, due to it causing an error with EuiSelectable, but I wasn't quite sure I understood...
        // searchProps={{
        //   placeholder: 'Find a space',
        //   compressed: true,
        // }}
        options={spaceItems}
        singleSelection={true}
        style={{ width: 300 }}
        onChange={onChange}
        listProps={{
          rowHeight: 40,
          showIcons: false,
        }}
      >
        {(list, search) => (
          <>
            <EuiPopoverTitle paddingSize="s">{search || 'Your spaces'}</EuiPopoverTitle>
            {list}
            <EuiPopoverFooter paddingSize="s">{this.renderManageButton()}</EuiPopoverFooter>
          </>
        )}
      </EuiSelectable>
    );
  }

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
}

export const SpacesMenu = injectI18n(SpacesMenuUI);
