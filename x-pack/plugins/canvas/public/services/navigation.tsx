/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ComponentType } from 'react';
import { TopNavMenuProps } from '../../../../../src/plugins/navigation/public';
import { CanvasServiceFactory } from '.';

export interface NavigationService {
  TopNavMenu: ComponentType<Omit<TopNavMenuProps, 'setMenuMountPoint'>>;
}

export const navigationServiceFactory: CanvasServiceFactory<NavigationService> = async (
  _coreSetup,
  _coreStart,
  _setupPlugins,
  { navigation },
  _appUpdater,
  params
) => ({
  TopNavMenu: (props: TopNavMenuProps) => (
    <navigation.ui.TopNavMenu {...props} setMenuMountPoint={params.setHeaderActionMenu} />
  ),
});
