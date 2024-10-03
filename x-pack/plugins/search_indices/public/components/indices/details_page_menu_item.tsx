/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiIcon,
  EuiPopover,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { MouseEventHandler, ReactElement, useState } from 'react';
import { useKibana } from '../../hooks/use_kibana';

enum MenuItems {
  playground = 'playground',
  apiReference = 'apiReference',
  deleteIndex = 'deleteIndex',
}
interface MenuItemsAction {
  href?: string;
  onClick?: (() => void) | MouseEventHandler;
}

const SearchIndexDetailsPageMenuItemPopoverItems = [
  {
    type: MenuItems.playground,
    iconType: 'launch',
    dataTestSubj: 'moreOptionsPlayground',
    iconComponent: <EuiIcon type="launch" />,
    target: undefined,
    text: (
      <EuiText size="s">
        {i18n.translate('xpack.searchIndices.moreOptions.playgroundLabel', {
          defaultMessage: 'Use in Playground',
        })}
      </EuiText>
    ),
    color: undefined,
  },
  {
    type: MenuItems.apiReference,
    iconType: 'documentation',
    dataTestSubj: 'moreOptionsApiReference',
    iconComponent: <EuiIcon type="documentation" />,
    target: '_blank',
    text: (
      <EuiText size="s">
        {i18n.translate('xpack.searchIndices.moreOptions.apiReferenceLabel', {
          defaultMessage: 'API Reference',
        })}
      </EuiText>
    ),
    color: undefined,
  },
  {
    type: MenuItems.deleteIndex,
    iconType: 'trash',
    dataTestSubj: 'moreOptionsDeleteIndex',
    iconComponent: <EuiIcon color="danger" type="trash" />,
    target: undefined,
    text: (
      <EuiText size="s" color="danger">
        {i18n.translate('xpack.searchIndices.moreOptions.deleteIndexLabel', {
          defaultMessage: 'Delete Index',
        })}
      </EuiText>
    ),
    color: 'danger',
  },
];
interface SearchIndexDetailsPageMenuItemPopoverProps {
  handleDeleteIndexModal: () => void;
  navigateToPlayground: () => void;
}

export const SearchIndexDetailsPageMenuItemPopover = ({
  handleDeleteIndexModal,
  navigateToPlayground,
}: SearchIndexDetailsPageMenuItemPopoverProps) => {
  const [showMoreOptions, setShowMoreOptions] = useState<boolean>(false);
  const { docLinks } = useKibana().services;
  const contextMenuItemsActions: Record<MenuItems, MenuItemsAction> = {
    playground: {
      href: undefined,
      onClick: navigateToPlayground,
    },
    apiReference: { href: docLinks.links.apiReference, onClick: undefined },
    deleteIndex: { href: undefined, onClick: handleDeleteIndexModal },
  };
  const contextMenuItems: ReactElement[] = SearchIndexDetailsPageMenuItemPopoverItems.map(
    (item) => (
      <EuiContextMenuItem
        key={item.iconType}
        icon={item.iconComponent}
        href={contextMenuItemsActions[item.type]?.href}
        size="s"
        onClick={contextMenuItemsActions[item.type]?.onClick}
        target={item.target}
        data-test-subj={item.dataTestSubj}
        color={item.color}
      >
        {item.text}
      </EuiContextMenuItem>
    )
  );

  return (
    <EuiPopover
      isOpen={showMoreOptions}
      closePopover={() => setShowMoreOptions(!showMoreOptions)}
      button={
        <EuiButtonIcon
          iconType="boxesVertical"
          onClick={() => setShowMoreOptions(!showMoreOptions)}
          size="m"
          data-test-subj="moreOptionsActionButton"
          aria-label={i18n.translate('xpack.searchIndices.moreOptions.ariaLabel', {
            defaultMessage: 'More options',
          })}
        />
      }
    >
      <EuiContextMenuPanel data-test-subj="moreOptionsContextMenu" items={contextMenuItems} />
    </EuiPopover>
  );
};
