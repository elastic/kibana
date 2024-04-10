/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo, useEffect, useCallback } from 'react';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { take } from 'rxjs';
import { FLYOUT_STORAGE_KEYS } from '../shared/constants/local_storage';
import { useKibana } from '../../../common/lib/kibana';
import { HeaderActions } from './components/header_actions';
import { FlyoutNavigation } from '../../shared/components/flyout_navigation';
import { DocumentDetailsLeftPanelKey } from '../shared/constants/panel_keys';
import { useRightPanelContext } from './context';
import { useWhichFlyout } from './hooks/use_which_flyout';

interface PanelNavigationProps {
  /**
   * If true, the expand detail button will be displayed
   */
  flyoutIsExpandable: boolean;
}

export const PanelNavigation: FC<PanelNavigationProps> = memo(({ flyoutIsExpandable }) => {
  const { storage, telemetry } = useKibana().services;
  const { onClose$, openLeftPanel } = useExpandableFlyoutApi();
  const { eventId, indexName, scopeId } = useRightPanelContext();
  const flyout = useWhichFlyout();

  const localStorageLeftPanelExpanded = storage.get(FLYOUT_STORAGE_KEYS.LEFT_PANEL_EXPANDED);
  const clearLocalStorage = useCallback(
    () =>
      storage.set(FLYOUT_STORAGE_KEYS.LEFT_PANEL_EXPANDED, {
        ...localStorageLeftPanelExpanded,
        [flyout]: false,
      }),
    [storage, localStorageLeftPanelExpanded, flyout]
  );

  const expandDetails = useCallback(() => {
    openLeftPanel({
      id: DocumentDetailsLeftPanelKey,
      params: {
        id: eventId,
        indexName,
        scopeId,
      },
    });

    storage.set(FLYOUT_STORAGE_KEYS.LEFT_PANEL_EXPANDED, {
      ...localStorageLeftPanelExpanded,
      [flyout]: true,
    });

    // we only want to keep track of the left side open while the user is still using the flyout.
    // that way when choosing another alert while the flyout is open, its state isn't going to reset.
    // we remove the value from local storage when flyout is closed.
    onClose$.pipe(take(1)).subscribe(() => clearLocalStorage());

    telemetry.reportDetailsFlyoutOpened({
      location: scopeId,
      panel: 'left',
    });
  }, [
    openLeftPanel,
    eventId,
    indexName,
    scopeId,
    storage,
    localStorageLeftPanelExpanded,
    flyout,
    onClose$,
    telemetry,
    clearLocalStorage,
  ]);

  // automatically open left panel if it was saved in local storage
  if (
    storage.get(FLYOUT_STORAGE_KEYS.LEFT_PANEL_EXPANDED) &&
    storage.get(FLYOUT_STORAGE_KEYS.LEFT_PANEL_EXPANDED)[flyout]
  ) {
    expandDetails();
  }

  // we remove the value from local storage when the component is unmounted
  // this takes care of the case when the user navigates away from the page while the flyout is open or for example closing the browser window
  useEffect(
    () => () => {
      clearLocalStorage();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

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
