/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo, useCallback } from 'react';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { Flyouts } from '../shared/constants/flyouts';
import { SECURITY_SOLUTION_ON_CLOSE_EVENT, TIMELINE_ON_CLOSE_EVENT } from '../..';
import { useWhichFlyoutIsOpen } from '../shared/hooks/use_which_flyout';
import { FLYOUT_STORAGE_KEYS } from '../shared/constants/local_storage';
import { useKibana } from '../../../common/lib/kibana';
import { HeaderActions } from './components/header_actions';
import { FlyoutNavigation } from '../../shared/components/flyout_navigation';
import { DocumentDetailsLeftPanelKey } from '../shared/constants/panel_keys';
import { useRightPanelContext } from './context';

interface PanelNavigationProps {
  /**
   * If true, the expand detail button will be displayed
   */
  flyoutIsExpandable: boolean;
}

export const PanelNavigation: FC<PanelNavigationProps> = memo(({ flyoutIsExpandable }) => {
  const { storage, telemetry } = useKibana().services;
  const { openLeftPanel } = useExpandableFlyoutApi();
  const { eventId, indexName, scopeId } = useRightPanelContext();
  const flyout = useWhichFlyoutIsOpen();

  const localStorageLeftPanelExpanded = storage.get(FLYOUT_STORAGE_KEYS.LEFT_PANEL_EXPANDED);
  const clearLocalStorage = useCallback(
    (flyoutId: string) => {
      storage.set(FLYOUT_STORAGE_KEYS.LEFT_PANEL_EXPANDED, {
        ...localStorageLeftPanelExpanded,
        [flyoutId]: false,
      });
    },
    [storage, localStorageLeftPanelExpanded]
  );

  const eventName =
    flyout === Flyouts.securitySolution
      ? SECURITY_SOLUTION_ON_CLOSE_EVENT
      : TIMELINE_ON_CLOSE_EVENT;
  const eventHandler = useCallback(
    (e: CustomEventInit) => {
      clearLocalStorage(e.detail);
      window.removeEventListener(eventName, eventHandler);
    },
    [clearLocalStorage, eventName]
  );

  window.addEventListener(eventName, eventHandler);

  const expandDetails = useCallback(() => {
    openLeftPanel({
      id: DocumentDetailsLeftPanelKey,
      params: {
        id: eventId,
        indexName,
        scopeId,
      },
    });
    telemetry.reportDetailsFlyoutOpened({
      location: scopeId,
      panel: 'left',
    });
    storage.set(FLYOUT_STORAGE_KEYS.LEFT_PANEL_EXPANDED, {
      ...localStorageLeftPanelExpanded,
      [flyout]: true,
    });
  }, [
    openLeftPanel,
    eventId,
    indexName,
    scopeId,
    telemetry,
    storage,
    localStorageLeftPanelExpanded,
    flyout,
  ]);

  // automatically open left panel if it was saved in local storage
  if (
    storage.get(FLYOUT_STORAGE_KEYS.LEFT_PANEL_EXPANDED) &&
    storage.get(FLYOUT_STORAGE_KEYS.LEFT_PANEL_EXPANDED)[flyout]
  ) {
    expandDetails();
  }

  return (
    <FlyoutNavigation
      flyoutIsExpandable={flyoutIsExpandable}
      expandDetails={expandDetails}
      collapseDetails={clearLocalStorage}
      actions={<HeaderActions />}
    />
  );
});

PanelNavigation.displayName = 'PanelNavigation';
