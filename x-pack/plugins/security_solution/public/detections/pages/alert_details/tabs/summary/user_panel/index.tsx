/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiTitle, EuiSpacer, EuiFlexGroup, EuiFlexItem, EuiIcon } from '@elastic/eui';
import type { TimelineEventsDetailsItem } from '@kbn/timelines-plugin/common';
import React, { useCallback, useMemo } from 'react';
import { find } from 'lodash/fp';
import type { EuiFlexItemProps } from '@elastic/eui/src/components/flex/flex_item';
import { useRiskScore } from '../../../../../../explore/containers/risk_score';
import { RiskScoreEntity } from '../../../../../../../common/search_strategy';
import { getEmptyTagValue } from '../../../../../../common/components/empty_value';
import { RiskScore } from '../../../../../../explore/components/risk_score/severity/common';
import {
  FirstLastSeen,
  FirstLastSeenType,
} from '../../../../../../common/components/first_last_seen';
import { DefaultFieldRenderer } from '../../../../../../timelines/components/field_renderers/field_renderers';
import { NetworkDetailsLink, UserDetailsLink } from '../../../../../../common/components/links';
import type { SelectedDataView } from '../../../../../../common/store/sourcerer/model';
import { getTimelineEventData } from '../../../utils/get_timeline_event_data';
import {
  IP_ADDRESSES_TITLE,
  LAST_SEEN_TITLE,
  USER_NAME_TITLE,
  USER_PANEL_TITLE,
  USER_RISK_CLASSIFICATION,
  USER_RISK_SCORE,
} from '../translation';
import { SummaryPanel } from '../wrappers';
import { UserPanelActions, USER_PANEL_ACTIONS_CLASS } from './user_panel_actions';

export interface UserPanelProps {
  data: TimelineEventsDetailsItem[] | null;
  selectedPatterns: SelectedDataView['selectedPatterns'];
  openUserDetailsPanel: (userName: string, onClose?: (() => void) | undefined) => void;
}

const UserPanelSection: React.FC<{
  title?: string | React.ReactElement;
  grow?: EuiFlexItemProps['grow'];
}> = ({ grow, title, children }) =>
  children ? (
    <EuiFlexItem grow={grow}>
      {title && (
        <>
          <EuiTitle size="xxs">
            <h5>{title}</h5>
          </EuiTitle>
          <EuiSpacer size="xs" />
        </>
      )}
      {children}
    </EuiFlexItem>
  ) : null;

export const UserPanel = React.memo(
  ({ data, selectedPatterns, openUserDetailsPanel }: UserPanelProps) => {
    const userName = useMemo(() => getTimelineEventData('user.name', data), [data]);

    const { data: userRisk, isLicenseValid: isRiskLicenseValid } = useRiskScore({
      riskEntity: RiskScoreEntity.user,
      skip: userName == null,
    });

    const renderUserActions = useCallback(
      () => <UserPanelActions openUserDetailsPanel={openUserDetailsPanel} userName={userName} />,
      [openUserDetailsPanel, userName]
    );

    const [userRiskScore, userRiskLevel] = useMemo(() => {
      const userRiskData = userRisk && userRisk.length > 0 ? userRisk[0] : undefined;
      const userRiskValue = userRiskData
        ? Math.round(userRiskData.user.risk.calculated_score_norm)
        : getEmptyTagValue();
      const userRiskSeverity = userRiskData ? (
        <RiskScore severity={userRiskData.user.risk.calculated_level} hideBackgroundColor />
      ) : (
        getEmptyTagValue()
      );

      return [userRiskValue, userRiskSeverity];
    }, [userRisk]);

    const sourceIpFields = useMemo(
      () => find({ field: 'source.ip', category: 'source' }, data)?.values ?? [],
      [data]
    );

    const renderSourceIp = useCallback(
      (ip: string) => (ip != null ? <NetworkDetailsLink ip={ip} /> : getEmptyTagValue()),
      []
    );

    return (
      <SummaryPanel
        actionsClassName={USER_PANEL_ACTIONS_CLASS}
        grow
        renderActionsPopover={userName ? renderUserActions : undefined}
        title={USER_PANEL_TITLE}
      >
        <EuiFlexGroup data-test-subj="user-panel">
          <EuiFlexItem grow={2}>
            <EuiFlexGroup>
              <UserPanelSection grow={false}>
                <EuiIcon type="userAvatar" size="xl" />
              </UserPanelSection>
              <UserPanelSection title={USER_NAME_TITLE}>
                {userName ? <UserDetailsLink userName={userName} /> : getEmptyTagValue()}
              </UserPanelSection>
            </EuiFlexGroup>
            <EuiSpacer size="l" />
            {isRiskLicenseValid && (
              <>
                <EuiFlexGroup data-test-subj="user-panel-risk">
                  {userRiskScore && (
                    <UserPanelSection title={USER_RISK_SCORE}>{userRiskScore}</UserPanelSection>
                  )}
                  {userRiskLevel && (
                    <UserPanelSection title={USER_RISK_CLASSIFICATION}>
                      {userRiskLevel}
                    </UserPanelSection>
                  )}
                </EuiFlexGroup>
                <EuiSpacer size="l" />
              </>
            )}
            <EuiFlexGroup data-test-subj="user-panel-ip">
              <UserPanelSection title={IP_ADDRESSES_TITLE} grow={2}>
                <DefaultFieldRenderer
                  rowItems={sourceIpFields}
                  attrName={'source.ip'}
                  idPrefix="alert-details-page-user"
                  render={renderSourceIp}
                />
              </UserPanelSection>
            </EuiFlexGroup>
            <EuiSpacer size="l" />
            <EuiFlexGroup>
              <UserPanelSection title={LAST_SEEN_TITLE} grow={2}>
                <FirstLastSeen
                  indexPatterns={selectedPatterns}
                  field={'user.name'}
                  value={userName}
                  type={FirstLastSeenType.LAST_SEEN}
                />
              </UserPanelSection>
            </EuiFlexGroup>
            <EuiSpacer />
          </EuiFlexItem>
        </EuiFlexGroup>
      </SummaryPanel>
    );
  }
);

UserPanel.displayName = 'UserPanel';
