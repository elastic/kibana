/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo, useState, useCallback, useEffect } from 'react';
import { EuiButtonGroup, EuiSpacer } from '@elastic/eui';
import type { EuiButtonGroupOptionProps } from '@elastic/eui/src/components/button/button_group/button_group';
import { useExpandableFlyoutContext } from '@kbn/expandable-flyout';
import { useLeftPanelContext } from '../context';
import { LeftPanelKey, LeftPanelVisualizeTab } from '..';
import {
  VISUALIZE_TAB_BUTTON_GROUP_TEST_ID,
  VISUALIZE_TAB_GRAPH_ANALYZER_BUTTON_TEST_ID,
  VISUALIZE_TAB_SESSION_VIEW_BUTTON_TEST_ID,
} from './test_ids';
import { ANALYZE_GRAPH_ID, AnalyzeGraph } from '../components/analyze_graph';
import {
  ANALYZER_GRAPH_BUTTON,
  SESSION_VIEW_BUTTON,
  VISUALIZE_BUTTONGROUP_OPTIONS,
} from './translations';
import { SESSION_VIEW_ID, SessionView } from '../components/session_view';
import { ALERTS_ACTIONS } from '../../../common/lib/apm/user_actions';
import { useStartTransaction } from '../../../common/lib/apm/use_start_transaction';

const visualizeButtons: EuiButtonGroupOptionProps[] = [
  {
    id: SESSION_VIEW_ID,
    label: SESSION_VIEW_BUTTON,
    'data-test-subj': VISUALIZE_TAB_SESSION_VIEW_BUTTON_TEST_ID,
  },
  {
    id: ANALYZE_GRAPH_ID,
    label: ANALYZER_GRAPH_BUTTON,
    'data-test-subj': VISUALIZE_TAB_GRAPH_ANALYZER_BUTTON_TEST_ID,
  },
];

/**
 * Visualize view displayed in the document details expandable flyout left section
 */
export const VisualizeTab: FC = memo(() => {
  const { eventId, indexName, scopeId } = useLeftPanelContext();
  const { panels, openLeftPanel } = useExpandableFlyoutContext();
  const [activeVisualizationId, setActiveVisualizationId] = useState(
    panels.left?.path?.subTab ?? SESSION_VIEW_ID
  );
  const { startTransaction } = useStartTransaction();
  const onChangeCompressed = useCallback(
    (optionId: string) => {
      setActiveVisualizationId(optionId);
      if (optionId === ANALYZE_GRAPH_ID) {
        startTransaction({ name: ALERTS_ACTIONS.OPEN_ANALYZER });
      }
      openLeftPanel({
        id: LeftPanelKey,
        path: {
          tab: LeftPanelVisualizeTab,
          subTab: optionId,
        },
        params: {
          id: eventId,
          indexName,
          scopeId,
        },
      });
    },
    [startTransaction, eventId, indexName, scopeId, openLeftPanel]
  );

  useEffect(() => {
    if (panels.left?.path?.subTab) {
      setActiveVisualizationId(panels.left?.path?.subTab);
    }
  }, [panels.left?.path?.subTab]);

  return (
    <>
      <EuiButtonGroup
        color="primary"
        name="coarsness"
        legend={VISUALIZE_BUTTONGROUP_OPTIONS}
        options={visualizeButtons}
        idSelected={activeVisualizationId}
        onChange={(id) => onChangeCompressed(id)}
        buttonSize="compressed"
        isFullWidth
        data-test-subj={VISUALIZE_TAB_BUTTON_GROUP_TEST_ID}
      />
      <EuiSpacer size="m" />
      {activeVisualizationId === SESSION_VIEW_ID && <SessionView />}
      {activeVisualizationId === ANALYZE_GRAPH_ID && <AnalyzeGraph />}
    </>
  );
});

VisualizeTab.displayName = 'VisualizeTab';
