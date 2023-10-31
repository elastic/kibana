/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlyoutBody, EuiFlyoutHeader } from '@elastic/eui';
import React, { useMemo } from 'react';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { FlyoutPanelProps } from '@kbn/expandable-flyout';
import { UsersType } from '../../../explore/users/store/model';
import { getCriteriaFromUsersType } from '../../../common/components/ml/criteria/get_criteria_from_users_type';
import { useGlobalTime } from '../../../common/containers/use_global_time';
import {
  useManagedUser,
  useObservedUser,
} from '../../../timelines/components/side_panel/new_user_detail/hooks';
import { AnomalyTableProvider } from '../../../common/components/ml/anomaly/anomaly_table_provider';
import { buildUserNamesFilter } from '../../../../common/search_strategy';
import { useRiskScore } from '../../../explore/containers/risk_score';
import { RiskScoreEntity } from '../../../../common/risk_engine';
import { ExpandFlyoutButton } from '../components/expand_flyout_button';
import { useExpandDetailsFlyout } from '../hooks/use_expand_details_flyout';
import { UserDetailsContent } from '../components/user_details_content';
import { FlyoutLoading } from '../../shared/components/flyout_loading';

export interface UserDetailsPanelProps extends Record<string, unknown> {
  contextID: string;
  scopeId: string;
  userName: string;
  isDraggable?: boolean;
}

export interface UserDetailsExpandableFlyoutProps extends FlyoutPanelProps {
  key: 'user-details';
  params: UserDetailsPanelProps;
}

export const UserDetailsPanelKey: UserDetailsExpandableFlyoutProps['key'] = 'user-details';

export const UserDetailsPanel = ({
  contextID,
  scopeId,
  userName,
  isDraggable,
}: UserDetailsPanelProps) => {
  const userNameFilterQuery = useMemo(
    () => (userName ? buildUserNamesFilter([userName]) : undefined),
    [userName]
  );

  const riskScoreState = useRiskScore({
    riskEntity: RiskScoreEntity.user,
    filterQuery: userNameFilterQuery,
  });

  const { data: userRisk } = riskScoreState;
  const userRiskData = userRisk && userRisk.length > 0 ? userRisk[0] : undefined;
  const riskInputs = userRiskData?.user.risk.inputs ?? [];
  const { isExpanded, onToggle } = useExpandDetailsFlyout({ riskInputs });
  const { to, from, isInitializing } = useGlobalTime();
  const observedUser = useObservedUser(userName);
  const managedUser = useManagedUser(userName);

  if (riskScoreState.loading || observedUser.isLoading || managedUser.isLoading) {
    return <FlyoutLoading />;
  }

  return (
    <>
      <EuiFlyoutHeader
        hasBorder
        // Temporary code to force the FlyoutHeader height.
        // Please delete it when FlyoutHeader supports multiple heights.
        css={css`
          &.euiFlyoutHeader {
            padding: 5px 0;
            min-height: 34px;
          }
        `}
      >
        {riskInputs.length > 0 && (
          <ExpandFlyoutButton
            isExpanded={isExpanded}
            onToggle={onToggle}
            expandedText={i18n.translate(
              'xpack.securitySolution.flyout.right.header.expandDetailButtonLabel',
              {
                defaultMessage: 'Collapse details',
              }
            )}
            collapsedText={i18n.translate(
              'xpack.securitySolution.flyout.right.header.collapseDetailButtonLabel',
              {
                defaultMessage: 'Expand details',
              }
            )}
          />
        )}
      </EuiFlyoutHeader>

      <EuiFlyoutBody
        css={css`
          .euiFlyoutBody__overflowContent {
            padding: 0;
          }
        `}
      >
        <AnomalyTableProvider
          criteriaFields={getCriteriaFromUsersType(UsersType.details, userName)}
          startDate={from}
          endDate={to}
          skip={isInitializing}
        >
          {({ isLoadingAnomaliesData, anomaliesData, jobNameById }) => (
            <UserDetailsContent
              userName={userName}
              managedUser={managedUser}
              observedUser={{
                ...observedUser,
                anomalies: {
                  isLoading: isLoadingAnomaliesData,
                  anomalies: anomaliesData,
                  jobNameById,
                },
              }}
              riskScoreState={riskScoreState}
              contextID={contextID}
              scopeId={scopeId}
              isDraggable={!!isDraggable}
            />
          )}
        </AnomalyTableProvider>
      </EuiFlyoutBody>
    </>
  );
};

UserDetailsPanel.displayName = 'UserDetailsPanel';
