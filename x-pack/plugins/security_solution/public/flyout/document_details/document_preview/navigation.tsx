/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo, useCallback } from 'react';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { useKibana } from '../../../common/lib/kibana';
import { PreviewNavigation } from '../../shared/components/preview_navigation';
import {
  DocumentDetailsLeftPanelKey,
  DocumentDetailsRightPanelKey,
} from '../shared/constants/panel_keys';
import { useDocumentPreviewPanelContext } from './context';

interface PanelNavigationProps {
  /**
   * If true, the expand detail button will be displayed
   */
  flyoutIsExpandable: boolean;
}

export const PanelNavigation: FC<PanelNavigationProps> = memo(({ flyoutIsExpandable }) => {
  const { telemetry } = useKibana().services;
  const { openFlyout } = useExpandableFlyoutApi();
  const { eventId, indexName, scopeId, title } = useDocumentPreviewPanelContext();

  const expandDetails = useCallback(() => {
    openFlyout({
      right: {
        id: DocumentDetailsRightPanelKey,
        params: {
          id: eventId,
          indexName,
          scopeId,
          title,
        },
      },
      left: {
        id: DocumentDetailsLeftPanelKey,
        params: {
          id: eventId,
          indexName,
          scopeId,
        },
      },
    });
    telemetry.reportDetailsFlyoutOpened({
      location: scopeId,
      panel: 'left',
    });
  }, [eventId, openFlyout, indexName, scopeId, telemetry, title]);

  return (
    <PreviewNavigation flyoutIsExpandable={flyoutIsExpandable} expandDetails={expandDetails} />
  );
});

PanelNavigation.displayName = 'PanelNavigation';
