/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useMemo } from 'react';
import { EuiTreeView } from '@elastic/eui';
import { useExpandableFlyoutContext } from '@kbn/expandable-flyout';
import { ExpandablePanel } from '../../shared/components/expandable_panel';
import { useRightPanelContext } from '../context';
import { LeftPanelKey, LeftPanelVisualizeTab } from '../../left';
import { ANALYZER_PREVIEW_TITLE } from './translations';
import { ANALYZER_PREVIEW_TEST_ID } from './test_ids';
import { ANALYZE_GRAPH_ID } from '../../left/components/analyze_graph';
import type { StatsNode } from '../../../common/containers/alerts/use_alert_prevalence_from_process_tree';
import { getTreeNodes } from '../utils/analyzer_helpers';

export interface AnalyzerTreeProps {
  /**
   * statsNode data from resolver tree api
   */
  statsNodes?: StatsNode[];
  /**
   * Boolean value of whether data is in loading
   */
  loading: boolean;
  /**
   * Boolean value of whether there is error in data fetching
   */
  error: boolean;
  /**
   * Optional parameter to limit the number of child nodes to be displayed
   */
  childCountLimit?: number;
  /**
   * Optional parameter to limit the depth of ancestors
   */
  ancestorLevel?: number;
  /**
   * Optional parameter to limit the depth of descendants
   */
  descendantLevel?: number;
}

/**
 * Analyzer tree that represent a summary view of analyzer. It shows current process, and its parent and child processes
 */
export const AnalyzerTree: React.FC<AnalyzerTreeProps> = ({
  statsNodes,
  loading,
  error,
  childCountLimit = 3,
  ancestorLevel = 1,
  descendantLevel = 1,
}) => {
  const { eventId, indexName, scopeId } = useRightPanelContext();
  const { openLeftPanel } = useExpandableFlyoutContext();
  const items = useMemo(
    () => getTreeNodes(statsNodes ?? [], childCountLimit, ancestorLevel, descendantLevel),
    [statsNodes, childCountLimit, ancestorLevel, descendantLevel]
  );

  const goToAnalyserTab = useCallback(() => {
    openLeftPanel({
      id: LeftPanelKey,
      path: {
        tab: LeftPanelVisualizeTab,
        subTab: ANALYZE_GRAPH_ID,
      },
      params: {
        id: eventId,
        indexName,
        scopeId,
      },
    });
  }, [eventId, openLeftPanel, indexName, scopeId]);

  if (items && items.length !== 0) {
    return (
      <ExpandablePanel
        header={{
          title: ANALYZER_PREVIEW_TITLE,
          callback: goToAnalyserTab,
          iconType: 'arrowStart',
        }}
        content={{ loading, error }}
        data-test-subj={ANALYZER_PREVIEW_TEST_ID}
      >
        <EuiTreeView
          items={items}
          display="compressed"
          aria-label={ANALYZER_PREVIEW_TITLE}
          showExpansionArrows
        />
      </ExpandablePanel>
    );
  }
  return null;
};

AnalyzerTree.displayName = 'AnalyzerTree';
