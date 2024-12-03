/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useMemo, useCallback } from 'react';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { i18n } from '@kbn/i18n';
import { useWhichFlyout } from '../../shared/hooks/use_which_flyout';
import { useDocumentDetailsContext } from '../../shared/context';
import { ANALYZER_GRAPH_TEST_ID } from './test_ids';
import { Resolver } from '../../../../resolver/view';
import { useTimelineDataFilters } from '../../../../timelines/containers/use_timeline_data_filters';
import { isActiveTimeline } from '../../../../helpers';
import { DocumentDetailsAnalyzerPanelKey } from '../../shared/constants/panel_keys';

export const ANALYZE_GRAPH_ID = 'analyze_graph';

export const ANALYZER_PREVIEW_BANNER = {
  title: i18n.translate(
    'xpack.securitySolution.flyout.left.visualizations.analyzer.panelPreviewTitle',
    {
      defaultMessage: 'Preview analyzer panels',
    }
  ),
  backgroundColor: 'warning',
  textColor: 'warning',
};

/**
 * Analyzer graph view displayed in the document details expandable flyout left section under the Visualize tab
 */
export const AnalyzeGraph: FC = () => {
  const { eventId, scopeId } = useDocumentDetailsContext();
  const key = useWhichFlyout() ?? 'memory';
  const { from, to, shouldUpdate, selectedPatterns } = useTimelineDataFilters(
    isActiveTimeline(scopeId)
  );
  const filters = useMemo(() => ({ from, to }), [from, to]);
  const { openPreviewPanel } = useExpandableFlyoutApi();

  const onClick = useCallback(() => {
    openPreviewPanel({
      id: DocumentDetailsAnalyzerPanelKey,
      params: {
        resolverComponentInstanceID: `${key}-${scopeId}`,
        banner: ANALYZER_PREVIEW_BANNER,
      },
    });
  }, [openPreviewPanel, key, scopeId]);

  return (
    <div data-test-subj={ANALYZER_GRAPH_TEST_ID}>
      <Resolver
        databaseDocumentID={eventId}
        resolverComponentInstanceID={`${key}-${scopeId}`}
        indices={selectedPatterns}
        shouldUpdate={shouldUpdate}
        filters={filters}
        isSplitPanel
        showPanelOnClick={onClick}
      />
    </div>
  );
};

AnalyzeGraph.displayName = 'AnalyzeGraph';
