/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './spaces_menu.scss';

import {
  EuiLoadingSpinner,
  EuiPopoverFooter,
  EuiPopoverTitle,
  EuiSelectable,
  EuiText,
} from '@elastic/eui';
import type { EuiSelectableOption } from '@elastic/eui/src/components/selectable';
import type { EuiSelectableOnChangeEvent } from '@elastic/eui/src/components/selectable/selectable';
import React, { Component, lazy, Suspense } from 'react';

import type { ApplicationStart, Capabilities } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import type { InjectedIntl } from '@kbn/i18n-react';
import { FormattedMessage, injectI18n } from '@kbn/i18n-react';

import type { Space } from '../../../common';
import { addSpaceIdToPath, ENTER_SPACE_PATH, SPACE_SEARCH_COUNT_THRESHOLD } from '../../../common';
import { getSpaceAvatarComponent } from '../../space_avatar';
import { ManageSpacesButton } from './manage_spaces_button';

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
  navigateToUrl: ApplicationStart['navigateToUrl'];
}

// interface State {
//   searchTerm: string;
//   allowSpacesListFocus: boolean;
// }

// class SpacesMenuUI extends Component<Props, State> {
class SpacesMenuUI extends Component<Props> {
  // ToDo: removed unused state members
  // public state = {
  //   searchTerm: '',
  //   allowSpacesListFocus: false,
  // };

  public render() {
    // const { intl, spaces, serverBasePath, navigateToUrl } = this.props;
    // const { searchTerm } = this.state;

    const spaceMenuOptions: EuiSelectableOption[] = this.getSpaceOptions();

    const noSpacesMessage = (
      <EuiText color="subdued" className="eui-textCenter">
        <FormattedMessage
          id="xpack.spaces.navControl.spacesMenu.noSpacesFound"
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
        searchProps={
          this.props.spaces.length >= SPACE_SEARCH_COUNT_THRESHOLD
            ? ({
                placeholder: i18n.translate(
                  'xpack.spaces.navControl.spacesMenu.findSpacePlaceholder',
                  {
                    defaultMessage: 'Find a space',
                  }
                ),
                compressed: true,
                isClearable: true,
                id: 'headerSpacesMenuListSearch',
              } as any)
            : undefined
        }
        noMatchesMessage={noSpacesMessage}
        emptyMessage={noSpacesMessage}
        options={spaceMenuOptions}
        singleSelection={'always'}
        style={{ width: 300 }}
        onChange={this.spaceSelectionChange}
        listProps={{
          rowHeight: 40,
          showIcons: false,
          onFocusBadge: false,
        }}
      >
        {(list, search) => (
          <>
            <EuiPopoverTitle paddingSize="s">
              {search ||
                i18n.translate('xpack.spaces.navControl.spacesMenu.selectSpacesTitle', {
                  defaultMessage: 'Your spaces',
                })}
            </EuiPopoverTitle>
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
        'aria-label': space.name,
        'aria-roledescription': 'space',
        label: space.name,
        key: space.id, // id is unique and we need it to form a path later
        prepend: (
          <Suspense fallback={<EuiLoadingSpinner size="m" />}>
            <LazySpaceAvatar space={space} size={'s'} announceSpaceName={false} />
          </Suspense>
        ),
        checked: undefined,
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
      // ToDo: check if the selected space is already the active space, find a way to gracefully close the popover

      const urlToSelectedSpace = addSpaceIdToPath(
        this.props.serverBasePath,
        selectedSpaceItem.key, // the key is the unique space id
        ENTER_SPACE_PATH
      );

      // ToDo: handle options (middle click or cmd/ctrl (new tab), shift click (new window))
      // console.log(`**** Event Class: ${event.constructor.name}`);
      // console.log(`**** Native Event: ${event.nativeEvent}`);
      // console.log(`**** Event Type: ${event.type}`);
      // console.log(`**** Event Default Prevented: ${event.defaultPrevented}`);

      if (event.shiftKey) {
        // Open in new window, shift is given priority over other modifiers
        // console.log(`**** SHIFT CLICK`);
        window.open(urlToSelectedSpace);
      } else if (event.ctrlKey || event.metaKey) {
        // Open in new tab - either a ctrl click or middle mouse button
        // console.log(`**** CTRL/CMD CLICK`);
        window.open(urlToSelectedSpace, '_blank'); // '_blank' causes new tab
      } else {
        // Force full page reload (usually not a good idea, but we need to in order to change spaces)
        // console.log(`**** URL: ${urlToSelectedSpace}`);
        // console.log(`**** NORMAL CLICK`);
        this.props.navigateToUrl(urlToSelectedSpace);
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
