/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './spaces_menu.scss';

import { EuiAvatar, EuiPopoverFooter, EuiPopoverTitle, EuiSelectable, EuiText } from '@elastic/eui';
import type { EuiSelectableOption } from '@elastic/eui/src/components/selectable';
import type { EuiSelectableOnChangeEvent } from '@elastic/eui/src/components/selectable/selectable';
import React, { Component } from 'react';

import type { ApplicationStart, Capabilities } from '@kbn/core/public';
import type { InjectedIntl } from '@kbn/i18n-react';
import { FormattedMessage, injectI18n } from '@kbn/i18n-react';

import type { Space } from '../../../common';
import { addSpaceIdToPath, ENTER_SPACE_PATH, SPACE_SEARCH_COUNT_THRESHOLD } from '../../../common';
// import { getSpaceAvatarComponent } from '../../space_avatar';
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
  searchTerm: string;
  allowSpacesListFocus: boolean;
}

class SpacesMenuUI extends Component<Props, State> {
  // ToDo: removed unused state members
  public state = {
    searchTerm: '',
    allowSpacesListFocus: false,
  };

  public render() {
    // const { intl, spaces, serverBasePath, navigateToUrl } = this.props;
    // const { searchTerm } = this.state;

    const spaceMenuOptions: EuiSelectableOption[] = this.getSpaceOptions();

    const noMatchesMessage = (
      <EuiText color="subdued" className="eui-textCenter">
        <FormattedMessage
          id="xpack.spaces.navControl.spacesMenu.noSpacesFoundTitle"
          defaultMessage=" no spaces found "
        />
      </EuiText>
    );

    const panelProps = {
      id: this.props.id,
      className: 'spcMenu',
      title: this.props.intl.formatMessage({
        id: 'xpack.spaces.navControl.spacesMenu.changeCurrentSpaceTitle',
        defaultMessage: 'Change current space',
      }),
    };

    return (
      <EuiSelectable
        {...panelProps}
        isLoading={this.props.isLoading}
        searchable={this.props.spaces.length >= SPACE_SEARCH_COUNT_THRESHOLD}
        // ToDo: find a way to do this more robustly, i.e. not use 'any'
        searchProps={
          this.props.spaces.length >= SPACE_SEARCH_COUNT_THRESHOLD
            ? ({
                placeholder: 'Find a space',
                compressed: true,
              } as any)
            : undefined
        }
        noMatchesMessage={noMatchesMessage}
        emptyMessage={noMatchesMessage}
        options={spaceMenuOptions}
        singleSelection={true}
        style={{ width: 300 }}
        onChange={this.spaceSelectionChange}
        listProps={{ showIcons: false }}
        // onChange={(newOptions, event) => {
        //   const selectedSpaceItem = newOptions.filter((item) => item.checked === 'on')[0];

        //   if (!!selectedSpaceItem) {
        //     const urlToSelectedSpace = addSpaceIdToPath(
        //       this.props.serverBasePath,
        //       selectedSpaceItem.key, // selectedSpace.id
        //       ENTER_SPACE_PATH
        //     );

        //     console.log(event);
        //     console.log(`**** Event Class: ${event.constructor.name}`);
        //     // console.log(`**** Event Type: ${event.type}`);

        //     if (event.shiftKey) {
        //       console.log(`**** SHIFT CLICK`);
        //     } else if (event.ctrlKey || event.metaKey) {
        //       // (event instanceof MouseEvent && (event.button === 1 || event.ctrlKey))
        //       console.log(`**** CTRL/CMD CLICK`);
        //     } else {
        //       console.log(`**** NORMAL CLICK`);
        //     }
        //   }
        // }}
        // listProps={{
        //   rowHeight: 40,
        //   showIcons: false,
        // }}
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

  private getSpaceOptions = (): EuiSelectableOption[] => {
    return this.props.spaces.map((space) => {
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
        checked: undefined, // ToDo: set 'on' if this space ID matches the one we're in?
        'data-test-subj': `${space.id}-selectableSpaceItem`,
        className: 'selectableSpaceItem',
      };
    });
  };

  private spaceSelectionChange = (
    newOptions: EuiSelectableOption[],
    event: EuiSelectableOnChangeEvent
  ) => {
    const selectedSpaceItem = newOptions.filter((item) => item.checked === 'on')[0];

    if (!!selectedSpaceItem) {
      const urlToSelectedSpace = addSpaceIdToPath(
        this.props.serverBasePath,
        selectedSpaceItem.key, // selectedSpace.id
        ENTER_SPACE_PATH
      );

      // ToDo: handle options (middle click or cmd/ctrl (new tab), shift click (new window))
      console.log(`**** Event Class: ${event.constructor.name}`);
      console.log(`**** Native Event: ${event.nativeEvent}`);

      if (event.shiftKey) {
        // Open in new window, shift is given priority over other modifiers
        console.log(`**** SHIFT CLICK`);
        window.open(urlToSelectedSpace);
      } else if (event.ctrlKey || event.metaKey) {
        // Open in new tab - either a ctrl click or middle mouse button
        console.log(`**** CTRL/CMD CLICK`);
        // window.open(urlToSelectedSpace); // ToDo: replace with new tab
      } else {
        // Force full page reload (usually not a good idea, but we need to in order to change spaces)
        // console.log(`**** URL: ${urlToSelectedSpace}`);
        console.log(`**** NORMAL CLICK`);
        // this.props.navigateToUrl(urlToSelectedSpace);
      }
    }
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
}

export const SpacesMenu = injectI18n(SpacesMenuUI);
