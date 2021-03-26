/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useMemo } from 'react';
import { TopNavMenuProps } from 'src/plugins/navigation/public';
import { Provider } from 'react-redux';
import { Store } from 'redux';
import { OverlayStart } from 'src/core/public';
import { CommitFn, State } from '../../../types';
import { CANVAS_APP } from '../../../common/lib';
import { EditMenu } from './edit_menu';
import { ShareMenu } from './share_menu';
import { OptionsMenu } from './options_menu';
import { getTopNavConfig, TopNavMenuAction, TopNavIds } from './get_top_nav_config';
import { showMenuPopover } from './show_menu_popover';
import { services, ServicesProvider } from '../../services';

export interface Props {
  NavigationUITopNavMenu: React.ComponentType<Omit<TopNavMenuProps, 'setMenuMountPoint'>>;
  canvasStore: Store<State>;
  commit: CommitFn;
  openFlyout: OverlayStart['openModal'];
  openModal: OverlayStart['openFlyout'];
}

export const TopNavMenu: FC<Props> = ({
  NavigationUITopNavMenu,
  canvasStore,
  commit,
  openFlyout,
  openModal,
}) => {
  const canvasTopNavMenuActions = useMemo(() => {
    const actions = {
      [TopNavIds.EDIT]: (anchorElement: HTMLElement) =>
        showMenuPopover({
          anchorElement,
          id: 'canvasEditMenuPopover',
          renderMenu: (onClose: () => void) => (
            <Provider store={canvasStore}>
              <EditMenu commit={commit} openModal={openModal} onClose={onClose} />
            </Provider>
          ),
        }),
      [TopNavIds.SHARE]: (anchorElement: HTMLElement) =>
        showMenuPopover({
          anchorElement,
          id: 'canvasShareMenuPopover',
          renderMenu: (onClose: () => void) => (
            <ServicesProvider providers={services}>
              <Provider store={canvasStore}>
                <ShareMenu openFlyout={openFlyout} onClose={onClose} />
              </Provider>
            </ServicesProvider>
          ),
        }),
      [TopNavIds.OPTIONS]: (anchorElement: HTMLElement) =>
        showMenuPopover({
          anchorElement,
          id: 'canvasOptionsMenuPopover',
          renderMenu: (onClose: () => void) => (
            <Provider store={canvasStore}>
              <OptionsMenu onClose={onClose} />
            </Provider>
          ),
        }),
    } as { [key: string]: TopNavMenuAction };

    return actions;
  }, [canvasStore, commit, openModal, openFlyout]);

  const topNavConfig = getTopNavConfig(canvasTopNavMenuActions);

  return <NavigationUITopNavMenu appName={CANVAS_APP} config={topNavConfig} />;
};
