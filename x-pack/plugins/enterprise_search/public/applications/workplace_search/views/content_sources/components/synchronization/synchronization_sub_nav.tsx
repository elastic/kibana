/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useValues } from 'kea';

import { EuiSideNavItemType } from '@elastic/eui';

import { generateNavLink } from '../../../../../shared/layout';
import { NAV } from '../../../../constants';
import {
  getContentSourcePath,
  SYNC_FREQUENCY_PATH,
  ASSETS_AND_OBJECTS_PATH,
} from '../../../../routes';
import { SourceLogic } from '../../source_logic';

export const useSynchronizationSubNav = () => {
  const {
    contentSource: { id, isSyncConfigEnabled },
  } = useValues(SourceLogic);

  if (!id || !isSyncConfigEnabled) return undefined;

  const navItems: Array<EuiSideNavItemType<unknown>> = [
    {
      id: 'sourceSynchronizationFrequency',
      name: NAV.SYNCHRONIZATION_FREQUENCY,
      ...generateNavLink({
        to: getContentSourcePath(SYNC_FREQUENCY_PATH, id, true),
        shouldShowActiveForSubroutes: true,
      }),
    },
    {
      id: 'sourceSynchronizationAssetsAndObjects',
      name: NAV.SYNCHRONIZATION_ASSETS_AND_OBJECTS,
      ...generateNavLink({ to: getContentSourcePath(ASSETS_AND_OBJECTS_PATH, id, true) }),
    },
  ];

  return navItems;
};
