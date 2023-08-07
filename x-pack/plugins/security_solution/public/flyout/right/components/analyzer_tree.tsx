/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useMemo } from 'react';
import {
  EuiPanel,
  EuiButtonEmpty,
  EuiTreeView,
  EuiLoadingSpinner,
  EuiEmptyPrompt,
} from '@elastic/eui';
import { useExpandableFlyoutContext } from '@kbn/expandable-flyout';
import { useRightPanelContext } from '../context';
import { LeftPanelKey, LeftPanelVisualizeTabPath } from '../../left';
import { ANALYZER_PREVIEW_TITLE, ANALYZER_PREVIEW_TEXT } from './translations';
import {
  ANALYZER_TREE_TEST_ID,
  ANALYZER_TREE_LOADING_TEST_ID,
  ANALYZER_TREE_ERROR_TEST_ID,
  ANALYZER_TREE_VIEW_DETAILS_BUTTON_TEST_ID,
} from './test_ids';
import type { StatsNode } from '../../../common/containers/alerts/use_alert_prevalence_from_process_tree';
import { getTreeNodes } from '../utils/analyzer_helpers';
import { ERROR_TITLE, ERROR_MESSAGE } from '../../shared/translations';

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
      path: LeftPanelVisualizeTabPath,
      params: {
        id: eventId,
        indexName,
        scopeId,
      },
    });
  }, [eventId, openLeftPanel, indexName, scopeId]);

  if (loading) {
    return <EuiLoadingSpinner data-test-subj={ANALYZER_TREE_LOADING_TEST_ID} />;
  }

  if (error) {
    return (
      <EuiEmptyPrompt
        iconType="error"
        color="danger"
        title={<h2>{ERROR_TITLE(ANALYZER_PREVIEW_TEXT)}</h2>}
        body={<p>{ERROR_MESSAGE(ANALYZER_PREVIEW_TEXT)}</p>}
        data-test-subj={ANALYZER_TREE_ERROR_TEST_ID}
      />
    );
  }

  if (items && items.length !== 0) {
    return (
      <EuiPanel hasBorder={true} paddingSize="none" data-test-subj={ANALYZER_TREE_TEST_ID}>
        <EuiPanel color="subdued" paddingSize="s">
          <EuiButtonEmpty
            color="primary"
            iconType="sessionViewer"
            onClick={goToAnalyserTab}
            data-test-subj={ANALYZER_TREE_VIEW_DETAILS_BUTTON_TEST_ID}
          >
            {ANALYZER_PREVIEW_TITLE}
          </EuiButtonEmpty>
          <EuiTreeView
            items={items}
            display="compressed"
            aria-label={ANALYZER_PREVIEW_TITLE}
            showExpansionArrows
          />
        </EuiPanel>
      </EuiPanel>
    );
  }
  return null;
};

AnalyzerTree.displayName = 'AnalyzerTree';
