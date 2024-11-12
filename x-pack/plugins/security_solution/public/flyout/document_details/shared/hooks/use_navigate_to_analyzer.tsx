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
import { useWhichFlyout } from './use_which_flyout';
import { ANALYZE_GRAPH_ID, ANALYZER_PREVIEW_BANNER } from '../../left/components/analyze_graph';
import {
  DocumentDetailsLeftPanelKey,
  DocumentDetailsRightPanelKey,
  DocumentDetailsAnalyzerPanelKey,
} from '../constants/panel_keys';
import { Flyouts } from '../constants/flyouts';
import { isTimelineScope } from '../../../../helpers';
import { DocumentEventTypes } from '../../../../common/lib/telemetry';

export interface UseNavigateToAnalyzerParams {
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

export interface UseNavigateToAnalyzerResult {
  /**
   * Callback to open analyzer in visualize tab
   */
  navigateToAnalyzer: () => void;
}

/**
 * Hook that returns the a callback to navigate to the analyzer in the flyout
 */
export const useNavigateToAnalyzer = ({
  isFlyoutOpen,
  eventId,
  indexName,
  scopeId,
}: UseNavigateToAnalyzerParams): UseNavigateToAnalyzerResult => {
  const { telemetry } = useKibana().services;
  const { openLeftPanel, openPreviewPanel, openFlyout } = useExpandableFlyoutApi();
  let key = useWhichFlyout() ?? 'memory';

  if (!isFlyoutOpen) {
    key = isTimelineScope(scopeId) ? Flyouts.timeline : Flyouts.securitySolution;
  }

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
        subTab: ANALYZE_GRAPH_ID,
      },
    }),
    [eventId, indexName, scopeId]
  );

  const preview: FlyoutPanelProps = useMemo(
    () => ({
      id: DocumentDetailsAnalyzerPanelKey,
      params: {
        resolverComponentInstanceID: `${key}-${scopeId}`,
        banner: ANALYZER_PREVIEW_BANNER,
      },
    }),
    [key, scopeId]
  );

  const navigateToAnalyzer = useCallback(() => {
    if (isFlyoutOpen) {
      openLeftPanel(left);
      openPreviewPanel(preview);
      telemetry.reportEvent(DocumentEventTypes.DetailsFlyoutTabClicked, {
        location: scopeId,
        panel: 'left',
        tabId: 'visualize',
      });
    } else {
      openFlyout({
        right,
        left,
        preview,
      });
      telemetry.reportEvent(DocumentEventTypes.DetailsFlyoutOpened, {
        location: scopeId,
        panel: 'left',
      });
    }
  }, [
    openFlyout,
    openLeftPanel,
    openPreviewPanel,
    right,
    left,
    preview,
    scopeId,
    telemetry,
    isFlyoutOpen,
  ]);

  return useMemo(() => ({ navigateToAnalyzer }), [navigateToAnalyzer]);
};
