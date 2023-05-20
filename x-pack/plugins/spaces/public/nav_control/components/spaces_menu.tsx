/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './spaces_menu.scss';

import type { ExclusiveUnion } from '@elastic/eui';
import {
  EuiLoadingSpinner,
  EuiPopoverFooter,
  EuiPopoverTitle,
  EuiSelectable,
  EuiText,
} from '@elastic/eui';
import type { EuiSelectableOption } from '@elastic/eui/src/components/selectable';
import type {
  EuiSelectableOnChangeEvent,
  EuiSelectableSearchableSearchProps,
} from '@elastic/eui/src/components/selectable/selectable';
import React, { Fragment, lazy, Suspense, useCallback, useMemo } from 'react';

import type { ApplicationStart, Capabilities } from '@kbn/core/public';
import { FormattedMessage, useI18n } from '@kbn/i18n-react';

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
  serverBasePath: string;
  toggleSpaceSelector: () => void;
  capabilities: Capabilities;
  navigateToApp: ApplicationStart['navigateToApp'];
  navigateToUrl: ApplicationStart['navigateToUrl'];
  readonly activeSpace: Space | null;
}

const SpacesMenuUI: React.FC<Props> = ({
  id,
  spaces,
  serverBasePath,
  toggleSpaceSelector,
  capabilities,
  navigateToApp,
  navigateToUrl,
  activeSpace,
}) => {
  const intl = useI18n();

  const renderManageButton = useMemo(
    () => (
      <ManageSpacesButton
        key="manageSpacesButton"
        className="spcMenu__manageButton"
        size="s"
        onClick={toggleSpaceSelector}
        capabilities={capabilities}
        navigateToApp={navigateToApp}
      />
    ),
    [capabilities, navigateToApp, toggleSpaceSelector]
  );

  const spaceSelectionChange = useCallback(
    (newOptions: EuiSelectableOption[], event: EuiSelectableOnChangeEvent) => {
      const selectedSpaceItem = newOptions.filter((item) => item.checked === 'on')[0];

      if (!!selectedSpaceItem) {
        const urlToSelectedSpace = addSpaceIdToPath(
          serverBasePath,
          selectedSpaceItem.key, // the key is the unique space id
          ENTER_SPACE_PATH
        );

        let middleClick = false;
        if (event.type === 'click') {
          middleClick = (event as React.MouseEvent).button === 1;
        }

        if (event.shiftKey) {
          // Open in new window, shift is given priority over other modifiers
          toggleSpaceSelector();
          window.open(urlToSelectedSpace);
        } else if (event.ctrlKey || event.metaKey || middleClick) {
          // Open in new tab - either a ctrl click or middle mouse button
          window.open(urlToSelectedSpace, '_blank');
        } else {
          // Force full page reload (usually not a good idea, but we need to in order to change spaces)
          // If the selected space is already the active space, gracefully close the popover
          if (activeSpace?.id === selectedSpaceItem.key) toggleSpaceSelector();
          else navigateToUrl(urlToSelectedSpace);
        }
      }
    },
    [activeSpace?.id, navigateToUrl, serverBasePath, toggleSpaceSelector]
  );

  const spaceOptions = useMemo(
    (): EuiSelectableOption[] =>
      spaces.map((space) => ({
        'aria-label': space.name,
        'aria-roledescription': 'space',
        label: space.name,
        key: space.id, // id is unique and we need it to form a path later
        prepend: (
          <Suspense fallback={<EuiLoadingSpinner size="m" />}>
            <LazySpaceAvatar space={space} size={'s'} announceSpaceName={false} />
          </Suspense>
        ),
        checked: activeSpace?.id === space.id ? 'on' : undefined,
        'data-test-subj': `${space.id}-selectableSpaceItem`,
        className: 'selectableSpaceItem',
      })),
    [activeSpace?.id, spaces]
  );

  const noSpacesMessage = (
    <EuiText color="subdued" className="eui-textCenter">
      <FormattedMessage
        id="xpack.spaces.navControl.spacesMenu.noSpacesFoundTitle"
        defaultMessage=" no spaces found "
      />
    </EuiText>
  );

  // In the future this could be replaced by EuiSelectableSearchableProps, but at this time is is not exported from EUI
  const searchableProps: ExclusiveUnion<
    { searchable: true; searchProps: EuiSelectableSearchableSearchProps<{}> },
    { searchable: false }
  > = useMemo(
    () =>
      spaces.length >= SPACE_SEARCH_COUNT_THRESHOLD
        ? {
            searchable: true,
            searchProps: {
              placeholder: intl.formatMessage({
                id: 'xpack.spaces.navControl.spacesMenu.findSpacePlaceholder',
                defaultMessage: 'Find a space',
              }),
              compressed: true,
              isClearable: true,
              id: 'headerSpacesMenuListSearch',
            },
          }
        : {
            searchable: false,
          },
    [intl, spaces.length]
  );

  return (
    <Fragment>
      <EuiSelectable
        aria-label={intl.formatMessage({
          id: 'xpack.spaces.navControl.spacesMenu.spacesAriaLabel',
          defaultMessage: 'Spaces',
        })}
        id={id}
        className={'spcMenu'}
        title={intl.formatMessage({
          id: 'xpack.spaces.navControl.spacesMenu.changeCurrentSpaceTitle',
          defaultMessage: 'Change current space',
        })}
        {...searchableProps}
        noMatchesMessage={noSpacesMessage}
        options={spaceOptions}
        singleSelection={'always'}
        style={{ width: 300 }}
        onChange={spaceSelectionChange}
        listProps={{
          rowHeight: 40,
          showIcons: true,
          onFocusBadge: false,
        }}
      >
        {(list, search) => (
          <Fragment>
            <EuiPopoverTitle paddingSize="s">
              {search ||
                intl.formatMessage({
                  id: 'xpack.spaces.navControl.spacesMenu.selectSpacesTitle',
                  defaultMessage: 'Your spaces',
                })}
            </EuiPopoverTitle>
            {list}
          </Fragment>
        )}
      </EuiSelectable>
      <EuiPopoverFooter paddingSize="s">{renderManageButton}</EuiPopoverFooter>
    </Fragment>
  );
};

export const SpacesMenu = React.memo(SpacesMenuUI);
