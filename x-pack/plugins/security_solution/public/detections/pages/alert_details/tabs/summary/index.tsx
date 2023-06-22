/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup } from '@elastic/eui';
import type { TimelineEventsDetailsItem } from '@kbn/timelines-plugin/common';
import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import type { SearchHit } from '../../../../../../common/search_strategy';
import { TimelineId } from '../../../../../../common/types';
import { useDetailPanel } from '../../../../../timelines/components/side_panel/hooks/use_detail_panel';
import { useGetUserCasesPermissions } from '../../../../../common/lib/kibana';
import type { SelectedDataView } from '../../../../../common/store/sourcerer/model';
import { SourcererScopeName } from '../../../../../common/store/sourcerer/model';
import { AlertRendererPanel } from './alert_renderer_panel';
import { RulePanel } from './rule_panel';
import { CasesPanel, CasesPanelNoReadPermissions } from './cases_panel';
import { HostPanel } from './host_panel';
import { UserPanel } from './user_panel';
import { SummaryColumn, SummaryRow } from './wrappers';

export interface DetailsSummaryTabProps {
  eventId: string;
  dataAsNestedObject: Ecs | null;
  detailsData: TimelineEventsDetailsItem[];
  searchHit?: SearchHit;
  sourcererDataView: SelectedDataView;
}

export const DetailsSummaryTab = React.memo(
  ({
    dataAsNestedObject,
    detailsData,
    searchHit,
    eventId,
    sourcererDataView,
  }: DetailsSummaryTabProps) => {
    const userCasesPermissions = useGetUserCasesPermissions();

    const { DetailsPanel, openHostDetailsPanel, openUserDetailsPanel } = useDetailPanel({
      isFlyoutView: true,
      sourcererScope: SourcererScopeName.detections,
      scopeId: TimelineId.detectionsAlertDetailsPage,
    });

    return (
      <>
        <EuiFlexGroup data-test-subj="alert-details-page-summary-tab" direction="row" wrap>
          <SummaryColumn grow={2}>
            <AlertRendererPanel dataAsNestedObject={dataAsNestedObject} />
            <RulePanel
              id={eventId}
              data={detailsData}
              searchHit={searchHit}
              browserFields={sourcererDataView.browserFields}
            />
            <SummaryRow>
              <HostPanel
                id={eventId}
                data={detailsData}
                openHostDetailsPanel={openHostDetailsPanel}
                selectedPatterns={sourcererDataView.selectedPatterns}
                browserFields={sourcererDataView.browserFields}
              />
              <UserPanel
                data={detailsData}
                selectedPatterns={sourcererDataView.selectedPatterns}
                openUserDetailsPanel={openUserDetailsPanel}
              />
            </SummaryRow>
          </SummaryColumn>
          <SummaryColumn grow={1}>
            {userCasesPermissions.read ? (
              <CasesPanel
                eventId={eventId}
                dataAsNestedObject={dataAsNestedObject}
                detailsData={detailsData}
              />
            ) : (
              <CasesPanelNoReadPermissions />
            )}
          </SummaryColumn>
        </EuiFlexGroup>
        {DetailsPanel}
      </>
    );
  }
);

DetailsSummaryTab.displayName = 'DetailsSummaryTab';
