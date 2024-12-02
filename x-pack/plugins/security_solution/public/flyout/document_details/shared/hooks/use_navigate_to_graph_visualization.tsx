/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import type { FlyoutPanelProps } from '@kbn/expandable-flyout';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import type { Maybe } from '@kbn/timelines-plugin/common/search_strategy/common';
import { useKibana } from '../../../../common/lib/kibana';
import {
  DocumentDetailsLeftPanelKey,
  DocumentDetailsRightPanelKey,
  VisualizationTabGraphKey,
} from '../constants/panel_keys';
import { DocumentEventTypes } from '../../../../common/lib/telemetry';

export interface UseNavigateToGraphVisualizationParams {
  /**
   * When flyout is already open, call open left panel only
   * When flyout is not open, open a new flyout
   */
  isFlyoutOpen: boolean;
  /**
   * Id of the document
   */
  eventId: string;
  /**
   * Name of the index used in the parent's page
   */
  indexName: Maybe<string> | undefined;
  /**
   * Scope id of the page
   */
  scopeId: string;
}

export interface UseNavigateToGraphVisualizationResult {
  /**
   * Callback to open analyzer in visualize tab
   */
  navigateToGraphVisualization: () => void;
}

/**
 * Hook that returns the a callback to navigate to the graph visualization in the flyout
 */
export const useNavigateToGraphVisualization = ({
  isFlyoutOpen,
  eventId,
  indexName,
  scopeId,
}: UseNavigateToGraphVisualizationParams): UseNavigateToGraphVisualizationResult => {
  const { telemetry } = useKibana().services;
  const { openLeftPanel, openFlyout } = useExpandableFlyoutApi();

  const right: FlyoutPanelProps = useMemo(
    () => ({
      id: DocumentDetailsRightPanelKey,
      params: {
        id: eventId,
        indexName,
        scopeId,
      },
    }),
    [eventId, indexName, scopeId]
  );

  const left: FlyoutPanelProps = useMemo(
    () => ({
      id: DocumentDetailsLeftPanelKey,
      params: {
        id: eventId,
        indexName,
        scopeId,
      },
      path: {
        tab: 'visualize',
        subTab: VisualizationTabGraphKey,
      },
    }),
    [eventId, indexName, scopeId]
  );

  const navigateToGraphVisualization = useCallback(() => {
    if (isFlyoutOpen) {
      openLeftPanel(left);
      telemetry.reportEvent(DocumentEventTypes.DetailsFlyoutTabClicked, {
        location: scopeId,
        panel: 'left',
        tabId: 'visualize',
      });
    } else {
      openFlyout({
        right,
        left,
      });
      telemetry.reportEvent(DocumentEventTypes.DetailsFlyoutOpened, {
        location: scopeId,
        panel: 'left',
      });
    }
  }, [openFlyout, openLeftPanel, right, left, scopeId, telemetry, isFlyoutOpen]);

  return useMemo(() => ({ navigateToGraphVisualization }), [navigateToGraphVisualization]);
};
