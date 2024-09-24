/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { TimelineTabs } from '@kbn/securitysolution-data-table';
import { EuiLink, EuiMark } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { ExpandablePanel } from '@kbn/security-solution-common';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import { useWhichFlyout } from '../../shared/hooks/use_which_flyout';
import {
  DocumentDetailsLeftPanelKey,
  DocumentDetailsAnalyzerPanelKey,
} from '../../shared/constants/panel_keys';
import { useKibana } from '../../../../common/lib/kibana';
import { useStartTransaction } from '../../../../common/lib/apm/use_start_transaction';
import { useInvestigateInTimeline } from '../../../../detections/components/alerts_table/timeline_actions/use_investigate_in_timeline';
import { ALERTS_ACTIONS } from '../../../../common/lib/apm/user_actions';
import { getScopedActions } from '../../../../helpers';
import { setActiveTabTimeline } from '../../../../timelines/store/actions';
import { useDocumentDetailsContext } from '../../shared/context';
import { useIsInvestigateInResolverActionEnabled } from '../../../../detections/components/alerts_table/timeline_actions/investigate_in_resolver';
import { AnalyzerPreview } from './analyzer_preview';
import { ANALYZER_PREVIEW_TEST_ID } from './test_ids';
import { ANALYZE_GRAPH_ID, ANALYZER_PREVIEW_BANNER } from '../../left/components/analyze_graph';

const timelineId = 'timeline-1';

/**
 * Analyzer preview under Overview, Visualizations. It shows a tree representation of analyzer.
 */
export const AnalyzerPreviewContainer: React.FC = () => {
  const { telemetry } = useKibana().services;
  const { dataAsNestedObject, isPreview, eventId, indexName, scopeId } =
    useDocumentDetailsContext();
  const { openLeftPanel, openPreviewPanel } = useExpandableFlyoutApi();
  const key = useWhichFlyout() ?? 'memory';

  const visualizationInFlyoutEnabled = useIsExperimentalFeatureEnabled(
    'visualizationInFlyoutEnabled'
  );
  // decide whether to show the analyzer preview or not
  const isEnabled = useIsInvestigateInResolverActionEnabled(dataAsNestedObject);

  const dispatch = useDispatch();
  const { startTransaction } = useStartTransaction();
  const { investigateInTimelineAlertClick } = useInvestigateInTimeline({
    ecsRowData: dataAsNestedObject,
  });

  // open timeline to the analyzer tab because the expandable flyout left panel Visualize => Analyzer tab is not ready
  const goToAnalyzerTab = useCallback(async () => {
    // open timeline
    await investigateInTimelineAlertClick();

    // open analyzer tab
    startTransaction({ name: ALERTS_ACTIONS.OPEN_ANALYZER });
    const scopedActions = getScopedActions(timelineId);
    if (scopedActions && dataAsNestedObject) {
      dispatch(
        scopedActions.updateGraphEventId({ id: timelineId, graphEventId: dataAsNestedObject._id })
      );
    }
    dispatch(setActiveTabTimeline({ id: timelineId, activeTab: TimelineTabs.graph }));
  }, [dataAsNestedObject, dispatch, investigateInTimelineAlertClick, startTransaction]);

  const gotoVisualizationTab = useCallback(() => {
    openLeftPanel({
      id: DocumentDetailsLeftPanelKey,
      path: {
        tab: 'visualize',
        subTab: ANALYZE_GRAPH_ID,
      },
      params: {
        id: eventId,
        indexName,
        scopeId,
      },
    });
    openPreviewPanel({
      id: DocumentDetailsAnalyzerPanelKey,
      params: {
        resolverComponentInstanceID: `${key}-${scopeId}`,
        banner: ANALYZER_PREVIEW_BANNER,
      },
    });
    telemetry.reportDetailsFlyoutTabClicked({
      location: scopeId,
      panel: 'left',
      tabId: 'visualize',
    });
  }, [eventId, indexName, openLeftPanel, openPreviewPanel, key, scopeId, telemetry]);

  return (
    <ExpandablePanel
      header={{
        title: (
          <FormattedMessage
            id="xpack.securitySolution.flyout.right.visualizations.analyzerPreview.analyzerPreviewTitle"
            defaultMessage="Analyzer preview"
          />
        ),
        iconType: visualizationInFlyoutEnabled ? 'arrowStart' : 'timeline',
        ...(isEnabled &&
          !isPreview && {
            link: {
              callback: visualizationInFlyoutEnabled ? gotoVisualizationTab : goToAnalyzerTab,
              tooltip: visualizationInFlyoutEnabled ? (
                <FormattedMessage
                  id="xpack.securitySolution.flyout.right.visualizations.analyzerPreview.analyzerPreviewOpenAnalyzerTooltip"
                  defaultMessage="Open analyzer graph"
                />
              ) : (
                <FormattedMessage
                  id="xpack.securitySolution.flyout.right.visualizations.analyzerPreview.analyzerPreviewInvestigateTooltip"
                  defaultMessage="Investigate in timeline"
                />
              ),
            },
          }),
      }}
      data-test-subj={ANALYZER_PREVIEW_TEST_ID}
    >
      {isEnabled ? (
        <AnalyzerPreview />
      ) : (
        <FormattedMessage
          id="xpack.securitySolution.flyout.right.visualizations.analyzerPreview.noDataDescription"
          defaultMessage="You can only visualize events triggered by hosts configured with the Elastic Defend integration or any {sysmon} data from {winlogbeat}. Refer to {link} for more information."
          values={{
            sysmon: <EuiMark>{'sysmon'}</EuiMark>,
            winlogbeat: <EuiMark>{'winlogbeat'}</EuiMark>,
            link: (
              <EuiLink
                href="https://www.elastic.co/guide/en/security/current/visual-event-analyzer.html"
                target="_blank"
              >
                <FormattedMessage
                  id="xpack.securitySolution.flyout.right.visualizations.analyzerPreview.noDataLinkText"
                  defaultMessage="Visual event analyzer"
                />
              </EuiLink>
            ),
          }}
        />
      )}
    </ExpandablePanel>
  );
};

AnalyzerPreviewContainer.displayName = 'AnalyzerPreviewContainer';
