/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo, useCallback } from 'react';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { useWhichFlyout } from './hooks/use_which_flyout';
import { FLYOUT_STORAGE_KEYS } from '../shared/constants/local_storage';
import { useKibana } from '../../../common/lib/kibana';
import { HeaderActions } from './components/header_actions';
import { FlyoutNavigation } from '../../shared/components/flyout_navigation';
import { DocumentDetailsLeftPanelKey } from '../left';
import { useRightPanelContext } from './context';

interface PanelNavigationProps {
  /**
   * If true, the expand detail button will be displayed
   */
  flyoutIsExpandable: boolean;
}

export const PanelNavigation: FC<PanelNavigationProps> = memo(({ flyoutIsExpandable }) => {
  const { storage, telemetry } = useKibana().services;
  const { onClose, openLeftPanel } = useExpandableFlyoutApi();
  const { eventId, indexName, scopeId } = useRightPanelContext();
  const flyout = useWhichFlyout();

  const expandDetails = useCallback(() => {
    openLeftPanel({
      id: DocumentDetailsLeftPanelKey,
      params: {
        id: eventId,
        indexName,
        scopeId,
      },
    });

    const localStorageLeftPanelExpanded = storage.get(FLYOUT_STORAGE_KEYS.LEFT_PANEL_EXPANDED);

    storage.set(FLYOUT_STORAGE_KEYS.LEFT_PANEL_EXPANDED, {
      ...localStorageLeftPanelExpanded,
      [flyout]: true,
    });

    // clearing local storage when flyout is closed
    const clearingLocalStorage = () => {
      storage.set(FLYOUT_STORAGE_KEYS.LEFT_PANEL_EXPANDED, {
        ...localStorageLeftPanelExpanded,
        [flyout]: false,
      });
    };
    onClose(clearingLocalStorage);

    telemetry.reportDetailsFlyoutOpened({
      tableId: scopeId,
      panel: 'left',
    });
  }, [openLeftPanel, eventId, indexName, scopeId, storage, flyout, onClose, telemetry]);

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
      actions={<HeaderActions />}
    />
  );
});

PanelNavigation.displayName = 'PanelNavigation';
