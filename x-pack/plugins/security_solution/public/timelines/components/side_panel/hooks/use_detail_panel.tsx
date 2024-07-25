/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo, useCallback } from 'react';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { useKibana } from '../../../../common/lib/kibana';
import { useSourcererDataView } from '../../../../sourcerer/containers';
import type { SourcererScopeName } from '../../../../sourcerer/store/model';
import { DocumentDetailsRightPanelKey } from '../../../../flyout/document_details/shared/constants/panel_keys';

export interface UseDetailPanelConfig {
  sourcererScope: SourcererScopeName;
  scopeId: string;
}
export interface UseDetailPanelReturn {
  openEventDetailsPanel: (eventId?: string, onClose?: () => void) => void;
}

export const useDetailPanel = ({
  sourcererScope,
  scopeId,
}: UseDetailPanelConfig): UseDetailPanelReturn => {
  const { telemetry } = useKibana().services;
  const { selectedPatterns } = useSourcererDataView(sourcererScope);

  const { openFlyout } = useExpandableFlyoutApi();

  const eventDetailsIndex = useMemo(() => selectedPatterns.join(','), [selectedPatterns]);

  const openEventDetailsPanel = useCallback(
    (eventId?: string, onClose?: () => void) => {
      openFlyout({
        right: {
          id: DocumentDetailsRightPanelKey,
          params: {
            id: eventId,
            indexName: eventDetailsIndex,
            scopeId,
          },
        },
      });
      telemetry.reportDetailsFlyoutOpened({
        location: scopeId,
        panel: 'right',
      });
    },
    [openFlyout, eventDetailsIndex, scopeId, telemetry]
  );

  return {
    openEventDetailsPanel,
  };
};
