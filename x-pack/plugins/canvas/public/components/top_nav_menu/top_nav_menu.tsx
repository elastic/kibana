/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { useStore } from 'react-redux';
import { Store } from 'redux';
import { CommitFn, State } from '../../../types';
import { TopNavMenu as Component } from './top_nav_menu.component';
import { navigationService, overlayService } from '../../services';

interface Props {
  commit: CommitFn;
}

export const TopNavMenu: FC<Props> = ({ commit }) => {
  const canvasStore = useStore();

  return (
    <Component
      NavigationUITopNavMenu={navigationService.getService().TopNavMenu}
      openModal={overlayService.getService().openModal}
      openFlyout={overlayService.getService().openFlyout}
      canvasStore={canvasStore as Store<State>}
      commit={commit}
    />
  );
};
