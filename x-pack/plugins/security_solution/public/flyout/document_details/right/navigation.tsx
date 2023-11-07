/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo, useCallback } from 'react';
import { useExpandableFlyoutContext } from '@kbn/expandable-flyout';
import { HeaderActions } from './components/header_actions';
import { FlyoutNavigation } from '../../shared/components/flyout_navigation';
import { LeftPanelKey } from '../left';
import { useRightPanelContext } from './context';

interface PanelNavigationProps {
  /**
   * If true, the expand detail button will be displayed
   */
  flyoutIsExpandable: boolean;
}

export const PanelNavigation: FC<PanelNavigationProps> = memo(({ flyoutIsExpandable }) => {
  const { openLeftPanel } = useExpandableFlyoutContext();
  const { eventId, indexName, scopeId } = useRightPanelContext();

  const expandDetails = useCallback(() => {
    openLeftPanel({
      id: LeftPanelKey,
      params: {
        id: eventId,
        indexName,
        scopeId,
      },
    });
  }, [eventId, openLeftPanel, indexName, scopeId]);

  return (
    <FlyoutNavigation
      flyoutIsExpandable={flyoutIsExpandable}
      expandDetails={expandDetails}
      actions={<HeaderActions />}
    />
  );
});

PanelNavigation.displayName = 'PanelNavigation';
