/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useState, useCallback, useEffect } from 'react';
import { EuiButtonGroup, EuiSpacer } from '@elastic/eui';
import type { EuiButtonGroupOptionProps } from '@elastic/eui/src/components/button/button_group/button_group';
import { useExpandableFlyoutApi, useExpandableFlyoutState } from '@kbn/expandable-flyout';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useDocumentDetailsContext } from '../../shared/context';
import { DocumentDetailsLeftPanelKey } from '../../shared/constants/panel_keys';
import { LeftPanelVisualizeTab } from '..';
import {
  VISUALIZE_TAB_BUTTON_GROUP_TEST_ID,
  VISUALIZE_TAB_GRAPH_ANALYZER_BUTTON_TEST_ID,
  VISUALIZE_TAB_SESSION_VIEW_BUTTON_TEST_ID,
} from './test_ids';
import { ANALYZE_GRAPH_ID, AnalyzeGraph } from '../components/analyze_graph';
import { SESSION_VIEW_ID, SessionView } from '../components/session_view';
import { ALERTS_ACTIONS } from '../../../../common/lib/apm/user_actions';
import { useStartTransaction } from '../../../../common/lib/apm/use_start_transaction';

const visualizeButtons: EuiButtonGroupOptionProps[] = [
  {
    id: SESSION_VIEW_ID,
    label: (
      <FormattedMessage
        id="xpack.securitySolution.flyout.left.visualize.sessionViewButtonLabel"
        defaultMessage="Session View"
      />
    ),
    'data-test-subj': VISUALIZE_TAB_SESSION_VIEW_BUTTON_TEST_ID,
  },
  {
    id: ANALYZE_GRAPH_ID,
    label: (
      <FormattedMessage
        id="xpack.securitySolution.flyout.left.visualize.analyzerGraphButtonLabel"
        defaultMessage="Analyzer Graph"
      />
    ),
    'data-test-subj': VISUALIZE_TAB_GRAPH_ANALYZER_BUTTON_TEST_ID,
  },
];

/**
 * Visualize view displayed in the document details expandable flyout left section
 */
export const VisualizeTab = memo(() => {
  const { eventId, indexName, scopeId } = useDocumentDetailsContext();
  const { openLeftPanel } = useExpandableFlyoutApi();
  const panels = useExpandableFlyoutState();
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
        id: DocumentDetailsLeftPanelKey,
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
        legend={i18n.translate(
          'xpack.securitySolution.flyout.left.visualize.buttonGroupLegendLabel',
          {
            defaultMessage: 'Visualize options',
          }
        )}
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
