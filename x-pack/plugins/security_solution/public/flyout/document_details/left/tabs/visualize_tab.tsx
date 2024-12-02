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
import { useWhichFlyout } from '../../shared/hooks/use_which_flyout';
import {
  DocumentDetailsAnalyzerPanelKey,
  VisualizationTabGraphKey,
} from '../../shared/constants/panel_keys';
import {
  VISUALIZE_TAB_BUTTON_GROUP_TEST_ID,
  VISUALIZE_TAB_GRAPH_ANALYZER_BUTTON_TEST_ID,
  VISUALIZE_TAB_GRAPH_VISUALIZATION_BUTTON_TEST_ID,
  VISUALIZE_TAB_SESSION_VIEW_BUTTON_TEST_ID,
} from './test_ids';
import {
  ANALYZE_GRAPH_ID,
  AnalyzeGraph,
  ANALYZER_PREVIEW_BANNER,
} from '../components/analyze_graph';
import { SESSION_VIEW_ID, SessionView } from '../components/session_view';
import { ALERTS_ACTIONS } from '../../../../common/lib/apm/user_actions';
import { useStartTransaction } from '../../../../common/lib/apm/use_start_transaction';
import { GraphVisualization } from '../components/graph_visualization';
import { useGraphPreview } from '../../shared/hooks/use_graph_preview';

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

const graphVisualizationButton: EuiButtonGroupOptionProps = {
  id: VisualizationTabGraphKey,
  iconType: 'beaker',
  iconSide: 'right',
  toolTipProps: {
    title: (
      <FormattedMessage
        id="xpack.securitySolution.flyout.left.visualize.graphVisualizationButton.technicalPreviewLabel"
        defaultMessage="Technical Preview"
      />
    ),
  },
  toolTipContent: i18n.translate(
    'xpack.securitySolution.flyout.left.visualize.graphVisualizationButton.technicalPreviewTooltip',
    {
      defaultMessage:
        'This functionality is in technical preview and may be changed or removed completely in a future release. Elastic will work to fix any issues, but features in technical preview are not subject to the support SLA of official GA features.',
    }
  ),
  label: (
    <FormattedMessage
      id="xpack.securitySolution.flyout.left.visualize.graphVisualizationButtonLabel"
      defaultMessage="Graph view"
    />
  ),
  'data-test-subj': VISUALIZE_TAB_GRAPH_VISUALIZATION_BUTTON_TEST_ID,
};

/**
 * Visualize view displayed in the document details expandable flyout left section
 */
export const VisualizeTab = memo(() => {
  const { scopeId, getFieldsData, dataAsNestedObject } = useDocumentDetailsContext();
  const { openPreviewPanel } = useExpandableFlyoutApi();
  const panels = useExpandableFlyoutState();
  const [activeVisualizationId, setActiveVisualizationId] = useState(
    panels.left?.path?.subTab ?? SESSION_VIEW_ID
  );
  const key = useWhichFlyout() ?? 'memory';
  const { startTransaction } = useStartTransaction();
  const onChangeCompressed = useCallback(
    (optionId: string) => {
      setActiveVisualizationId(optionId);
      if (optionId === ANALYZE_GRAPH_ID) {
        startTransaction({ name: ALERTS_ACTIONS.OPEN_ANALYZER });
        openPreviewPanel({
          id: DocumentDetailsAnalyzerPanelKey,
          params: {
            resolverComponentInstanceID: `${key}-${scopeId}`,
            banner: ANALYZER_PREVIEW_BANNER,
          },
        });
      }
    },
    [startTransaction, openPreviewPanel, key, scopeId]
  );

  useEffect(() => {
    if (panels.left?.path?.subTab) {
      setActiveVisualizationId(panels.left?.path?.subTab);
    }
  }, [panels.left?.path?.subTab]);

  // Decide whether to show the graph preview or not
  const { isAuditLog: isGraphPreviewEnabled } = useGraphPreview({
    getFieldsData,
    ecsData: dataAsNestedObject,
  });

  const options = [...visualizeButtons];

  if (isGraphPreviewEnabled) {
    options.push(graphVisualizationButton);
  }

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
        options={options}
        idSelected={activeVisualizationId}
        onChange={(id) => onChangeCompressed(id)}
        buttonSize="compressed"
        isFullWidth
        data-test-subj={VISUALIZE_TAB_BUTTON_GROUP_TEST_ID}
      />
      <EuiSpacer size="m" />
      {activeVisualizationId === SESSION_VIEW_ID && <SessionView />}
      {activeVisualizationId === ANALYZE_GRAPH_ID && <AnalyzeGraph />}
      {activeVisualizationId === VisualizationTabGraphKey && <GraphVisualization />}
    </>
  );
});

VisualizeTab.displayName = 'VisualizeTab';
