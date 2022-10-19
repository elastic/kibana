/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable react/jsx-no-literals */

import React, { useCallback, useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiSpacer, EuiTitle } from '@elastic/eui';
import { css } from '@emotion/react';
import type { FlexItemGrowSize } from '@elastic/eui/src/components/flex/flex_item';
import type { TimelineEventsDetailsItem } from '@kbn/timelines-plugin/common';
import { ALERT_RULE_UUID } from '@kbn/rule-data-utils';
import { TimelineId } from '../../../../../../common/types';
import { HoverVisibilityContainer } from '../../../../../common/components/hover_visibility_container';
import { useDetailPanel } from '../../../../../timelines/components/side_panel/hooks/use_detail_panel';
import { useGetUserCasesPermissions } from '../../../../../common/lib/kibana';
import type { SelectedDataView } from '../../../../../common/store/sourcerer/model';
import { SourcererScopeName } from '../../../../../common/store/sourcerer/model';
import type { Ecs } from '../../../../../../common/ecs';
import { AlertRenderer } from './alert_renderer';
import { RulePanel } from './rule_panel';
import { CasePanel, CasesPanelNoReadPermissions } from './case_panel';
import { HostPanel } from './host_panel';
import { UserPanel } from './user_panel';
import { HostPanelActions, HOST_PANEL_ACTIONS_CLASS } from './host_panel/host_panel_actions';
import { getTimelineEventData } from '../../utils/get_timeline_event_data';
import { UserPanelActions, USER_PANEL_ACTIONS_CLASS } from './user_panel/user_panel_actions';
import { RulePanelActions, RULE_PANEL_ACTIONS_CLASS } from './rule_panel/rule_panel_actions';

export interface DetailsSummaryTabProps {
  dataAsNestedObject: Ecs | null;
  detailsData: TimelineEventsDetailsItem[];
  sourcererDataView: SelectedDataView;
}

const Column: React.FC<{ grow?: FlexItemGrowSize }> = ({ children, grow }) => (
  <EuiFlexItem grow={grow}>
    <EuiFlexGroup
      direction="column"
      wrap={false}
      css={css`
        flex-wrap: nowrap;
      `}
    >
      {children}
    </EuiFlexGroup>
  </EuiFlexItem>
);

const Row: React.FC<{ grow?: FlexItemGrowSize }> = ({ children, grow }) => (
  <EuiFlexItem grow={grow}>
    <EuiFlexGroup direction="row" wrap>
      {children}
    </EuiFlexGroup>
  </EuiFlexItem>
);

const Panel: React.FC<{
  grow?: FlexItemGrowSize;
  title: string;
  actionsClassName?: string;
  renderActionsPopover?: () => JSX.Element;
}> = ({ actionsClassName, children, grow = false, renderActionsPopover, title }) => (
  <EuiFlexItem grow={grow}>
    <EuiPanel hasShadow={false} hasBorder>
      <HoverVisibilityContainer targetClassNames={[actionsClassName ?? '']}>
        <EuiFlexGroup direction="row" justifyContent="spaceBetween">
          <EuiFlexItem>
            <EuiTitle size="s">
              <h3>{title}</h3>
            </EuiTitle>
          </EuiFlexItem>
          {actionsClassName && renderActionsPopover ? (
            <EuiFlexItem grow={false}>{renderActionsPopover()}</EuiFlexItem>
          ) : null}
        </EuiFlexGroup>
      </HoverVisibilityContainer>
      <EuiSpacer size="l" />
      {children}
    </EuiPanel>
  </EuiFlexItem>
);

export const DetailsSummaryTab = React.memo(
  ({ dataAsNestedObject, detailsData, sourcererDataView }: DetailsSummaryTabProps) => {
    const eventId = dataAsNestedObject?._id as string;
    const hostName = useMemo(() => getTimelineEventData('host.name', detailsData), [detailsData]);
    const userName = useMemo(() => getTimelineEventData('user.name', detailsData), [detailsData]);
    const ruleUuid = useMemo(
      () => getTimelineEventData(ALERT_RULE_UUID, detailsData),
      [detailsData]
    );
    const userCasesPermissions = useGetUserCasesPermissions();

    const { DetailsPanel, openHostDetailsPanel, openUserDetailsPanel } = useDetailPanel({
      isFlyoutView: true,
      sourcererScope: SourcererScopeName.detections,
      scopeId: TimelineId.detectionsAlertDetailsPage,
    });

    const renderHostActions = useCallback(
      () => <HostPanelActions openHostDetailsPanel={openHostDetailsPanel} hostName={hostName} />,
      [hostName, openHostDetailsPanel]
    );

    const renderUserActions = useCallback(
      () => <UserPanelActions openUserDetailsPanel={openUserDetailsPanel} userName={userName} />,
      [openUserDetailsPanel, userName]
    );

    const renderRuleActions = useCallback(
      () => <RulePanelActions ruleUuid={ruleUuid} />,
      [ruleUuid]
    );

    return (
      <>
        <EuiFlexGroup data-test-subj="alert-details-page-summary-tab" direction="row" wrap>
          <Column grow={2}>
            <Panel title="Alert Reason">
              <AlertRenderer dataAsNestedObject={dataAsNestedObject} />
            </Panel>
            <Panel
              title="Rule"
              actionsClassName={RULE_PANEL_ACTIONS_CLASS}
              renderActionsPopover={renderRuleActions}
            >
              <RulePanel
                id={eventId}
                data={detailsData}
                browserFields={sourcererDataView.browserFields}
              />
            </Panel>
            <Row>
              <Panel
                title="Host"
                grow
                actionsClassName={HOST_PANEL_ACTIONS_CLASS}
                renderActionsPopover={hostName ? renderHostActions : undefined}
              >
                <HostPanel
                  id={eventId}
                  data={detailsData}
                  selectedPatterns={sourcererDataView.selectedPatterns}
                  browserFields={sourcererDataView.browserFields}
                />
              </Panel>
              <Panel
                title="User"
                grow
                actionsClassName={USER_PANEL_ACTIONS_CLASS}
                renderActionsPopover={userName ? renderUserActions : undefined}
              >
                <UserPanel
                  data={detailsData}
                  selectedPatterns={sourcererDataView.selectedPatterns}
                />
              </Panel>
            </Row>
          </Column>
          <Column grow={1}>
            <Panel title="Case">
              {userCasesPermissions.read ? (
                <CasePanel
                  eventId={eventId}
                  dataAsNestedObject={dataAsNestedObject}
                  detailsData={detailsData}
                />
              ) : (
                <CasesPanelNoReadPermissions />
              )}
            </Panel>
            <Panel title="Recent Activity">Recent Activity Panel</Panel>
          </Column>
        </EuiFlexGroup>
        {DetailsPanel}
      </>
    );
  }
);

DetailsSummaryTab.displayName = 'DetailsSummaryTab';
