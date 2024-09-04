/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { get } from 'lodash/fp';
// import { TimelineTabs } from '@kbn/securitysolution-data-table';
import { EuiLink, EuiMark, useEuiTheme } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { ExpandablePanel } from '@kbn/security-solution-common';
import { useStartTransaction } from '../../../../common/lib/apm/use_start_transaction';
import { useInvestigateInTimeline } from '../../../../detections/components/alerts_table/timeline_actions/use_investigate_in_timeline';
import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
// import { ALERTS_ACTIONS } from '../../../../common/lib/apm/user_actions';
// import { getScopedActions } from '../../../../helpers';
// import { setActiveTabTimeline } from '../../../../timelines/store/actions';
import { useDocumentDetailsContext } from '../../shared/context';
// import { useIsInvestigateInResolverActionEnabled } from '../../../../detections/components/alerts_table/timeline_actions/investigate_in_resolver';
import { GraphPreview } from './graph_preview';
import { GRAPH_PREVIEW_TEST_ID } from '@kbn/cloud-security-posture';
import type { GetFieldsData } from '../../shared/hooks/use_get_fields_data';

// const timelineId = 'timeline-1';

export const useIsInvestigateInGraphActionEnabled = (getFieldsData: GetFieldsData, ecsData?: Ecs) => {
  return useMemo(() => {
    const actorsIds = getFieldsData('actor.entity.id');
    const targetsIds = getFieldsData('target.entity.id');
    const action = get(['event', 'action'], ecsData);
    const hasAuditRelationship =
      (actorsIds?.length ?? 0) > 0 && (targetsIds?.length ?? 0) > 0 && action?.length > 0;

    return hasAuditRelationship;
  }, [ ecsData, getFieldsData ]);
};


/**
 * Graph preview under Overview, Visualizations. It shows a graph representation of alert.
 */
export const GraphPreviewContainer: React.FC = () => {
  const { dataAsNestedObject, getFieldsData, isPreview } = useDocumentDetailsContext();

  // Decide whether to show the graph preview or not
  const isEnabled = useIsInvestigateInGraphActionEnabled(getFieldsData, dataAsNestedObject);

  const dispatch = useDispatch();
  const { startTransaction } = useStartTransaction();
  const { investigateInTimelineAlertClick } = useInvestigateInTimeline({
    ecsRowData: dataAsNestedObject,
  });

  // Open timeline to the analyzer tab because the expandable flyout left panel Visualize => Analyzer tab is not ready
  const goToGraphTab = useCallback(async () => {
    // Open timeline
    // await investigateInTimelineAlertClick();

    // Open graph view tab
    // startTransaction({ name: ALERTS_ACTIONS.OPEN_ANALYZER });
    // const scopedActions = getScopedActions(timelineId);
    // if (scopedActions && dataAsNestedObject) {
    //   dispatch(
    //     scopedActions.updateGraphEventId({ id: timelineId, graphEventId: dataAsNestedObject._id })
    //   );
    // }
    // dispatch(setActiveTabTimeline({ id: timelineId, activeTab: TimelineTabs.graph }));
  }, [dataAsNestedObject, dispatch, investigateInTimelineAlertClick, startTransaction]);

  return (
    <ExpandablePanel
      header={{
        title: (
          <FormattedMessage
            id="xpack.securitySolution.flyout.right.visualizations.graphPreview.graphPreviewTitle"
            defaultMessage="Graph preview"
          />
        ),
        iconType: 'timeline',
        ...(isEnabled &&
          !isPreview && {
            link: {
              callback: goToGraphTab,
              tooltip: (
                <FormattedMessage
                  id="xpack.securitySolution.flyout.right.visualizations.graphPreview.graphPreviewTooltip"
                  defaultMessage="Investigate in timeline"
                />
              ),
            },
          }),
      }}
      data-test-subj={GRAPH_PREVIEW_TEST_ID}
    >
      {isEnabled ? (
        <GraphPreview />
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

GraphPreviewContainer.displayName = 'GraphPreviewContainer';
