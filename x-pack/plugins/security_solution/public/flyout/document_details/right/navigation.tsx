/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo, useCallback } from 'react';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { FlyoutNavigation } from '@kbn/security-solution-common';
import { useKibana } from '../../../common/lib/kibana';
import { HeaderActions } from './components/header_actions';
import { DocumentDetailsLeftPanelKey } from '../shared/constants/panel_keys';
import { useDocumentDetailsContext } from '../shared/context';

interface PanelNavigationProps {
  /**
   * If true, the expand detail button will be displayed
   */
  flyoutIsExpandable: boolean;
}

export const PanelNavigation: FC<PanelNavigationProps> = memo(({ flyoutIsExpandable }) => {
  const { telemetry } = useKibana().services;
  const { openLeftPanel } = useExpandableFlyoutApi();
  const { eventId, indexName, scopeId } = useDocumentDetailsContext();

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
  }, [eventId, openLeftPanel, indexName, scopeId, telemetry]);

  return (
    <FlyoutNavigation
      flyoutIsExpandable={flyoutIsExpandable}
      expandDetails={expandDetails}
      actions={<HeaderActions />}
    />
  );
});

PanelNavigation.displayName = 'PanelNavigation';
