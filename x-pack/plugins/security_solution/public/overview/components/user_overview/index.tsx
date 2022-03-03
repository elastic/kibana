/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexItem, EuiFlexGroup } from '@elastic/eui';
import { euiLightVars as lightTheme, euiDarkVars as darkTheme } from '@kbn/ui-theme';
import { getOr } from 'lodash/fp';
import React, { useCallback, useMemo } from 'react';
import styled from 'styled-components';
import { buildUserNamesFilter, RiskSeverity } from '../../../../common/search_strategy';
import { DEFAULT_DARK_MODE } from '../../../../common/constants';
import { DescriptionList } from '../../../../common/utility_types';
import { useUiSetting$ } from '../../../common/lib/kibana';
import { getEmptyTagValue } from '../../../common/components/empty_value';
import {
  dateRenderer,
  DefaultFieldRenderer,
} from '../../../timelines/components/field_renderers/field_renderers';
import { InspectButton, InspectButtonContainer } from '../../../common/components/inspect';
import { Loader } from '../../../common/components/loader';
import { NetworkDetailsLink } from '../../../common/components/links';
import { hasMlUserPermissions } from '../../../../common/machine_learning/has_ml_user_permissions';
import { useMlCapabilities } from '../../../common/components/ml/hooks/use_ml_capabilities';
import { AnomalyScores } from '../../../common/components/ml/score/anomaly_scores';
import { Anomalies, NarrowDateRange } from '../../../common/components/ml/types';
import { DescriptionListStyled, OverviewWrapper } from '../../../common/components/page';

import * as i18n from './translations';

import { OverviewDescriptionList } from '../../../common/components/overview_description_list';
import { useUserRiskScore } from '../../../risk_score/containers';
import { RiskScore } from '../../../common/components/severity/common';
import { UserItem } from '../../../../common/search_strategy/security_solution/users/common';

export interface UserSummaryProps {
  contextID?: string; // used to provide unique draggable context when viewing in the side panel
  data: UserItem;
  id: string;
  isDraggable?: boolean;
  isInDetailsSidePanel: boolean;
  loading: boolean;
  isLoadingAnomaliesData: boolean;
  anomaliesData: Anomalies | null;
  startDate: string;
  endDate: string;
  narrowDateRange: NarrowDateRange;
  userName: string;
}

const UserRiskOverviewWrapper = styled(EuiFlexGroup)`
  padding-top: ${({ theme }) => theme.eui.euiSizeM};
  width: 66.6%;
`;

export const UserOverview = React.memo<UserSummaryProps>(
  ({
    anomaliesData,
    contextID,
    data,
    id,
    isDraggable = false,
    isInDetailsSidePanel = false, // Rather than duplicate the component, alter the structure based on it's location
    isLoadingAnomaliesData,
    loading,
    narrowDateRange,
    startDate,
    endDate,
    userName,
  }) => {
    const capabilities = useMlCapabilities();
    const userPermissions = hasMlUserPermissions(capabilities);
    const [darkMode] = useUiSetting$<boolean>(DEFAULT_DARK_MODE);
    const [_, { data: userRisk, isModuleEnabled }] = useUserRiskScore({
      filterQuery: userName ? buildUserNamesFilter([userName]) : undefined,
    });

    const getDefaultRenderer = useCallback(
      (fieldName: string, fieldData: UserItem) => (
        <DefaultFieldRenderer
          rowItems={getOr([], fieldName, fieldData)}
          attrName={fieldName}
          idPrefix={contextID ? `user-overview-${contextID}` : 'iuser-overview'}
          isDraggable={isDraggable}
        />
      ),
      [contextID, isDraggable]
    );

    const [userRiskScore, userRiskLevel] = useMemo(() => {
      if (isModuleEnabled) {
        const userRiskData = userRisk && userRisk.length > 0 ? userRisk[0] : undefined;
        return [
          {
            title: i18n.USER_RISK_SCORE,
            description: (
              <>
                {userRiskData ? Math.round(userRiskData.risk_stats.risk_score) : getEmptyTagValue()}
              </>
            ),
          },
          {
            title: i18n.USER_RISK_CLASSIFICATION,
            description: (
              <>
                {userRiskData ? (
                  <RiskScore severity={userRiskData.risk as RiskSeverity} hideBackgroundColor />
                ) : (
                  getEmptyTagValue()
                )}
              </>
            ),
          },
        ];
      }
      return [undefined, undefined];
    }, [userRisk, isModuleEnabled]);

    const column = useMemo(
      () => [
        {
          title: i18n.USER_ID,
          description: data && data.user ? getDefaultRenderer('user.id', data) : getEmptyTagValue(),
        },
        {
          title: i18n.USER_DOMAIN,
          description:
            data && data.user ? getDefaultRenderer('user.domain', data) : getEmptyTagValue(),
        },
      ],
      [data, getDefaultRenderer]
    );

    const firstColumn = useMemo(
      () =>
        userPermissions
          ? [
              ...column,
              {
                title: i18n.MAX_ANOMALY_SCORE_BY_JOB,
                description: (
                  <AnomalyScores
                    anomalies={anomaliesData}
                    startDate={startDate}
                    endDate={endDate}
                    isLoading={isLoadingAnomaliesData}
                    narrowDateRange={narrowDateRange}
                  />
                ),
              },
            ]
          : column,
      [
        anomaliesData,
        column,
        endDate,
        isLoadingAnomaliesData,
        narrowDateRange,
        startDate,
        userPermissions,
      ]
    );

    const descriptionLists: Readonly<DescriptionList[][]> = useMemo(
      () => [
        firstColumn,
        [
          {
            title: i18n.FIRST_SEEN,
            description: data ? dateRenderer(data.firstSeen) : getEmptyTagValue(),
          },
          {
            title: i18n.LAST_SEEN,
            description: data ? dateRenderer(data.lastSeen) : getEmptyTagValue(),
          },
        ],
        [
          {
            title: i18n.HOST_OS,
            description: getDefaultRenderer('host.os.name', data),
          },

          {
            title: i18n.HOST_FAMILY,
            description: getDefaultRenderer('host.os.family', data),
          },
          {
            title: i18n.HOST_IP,
            description: (
              <DefaultFieldRenderer
                rowItems={getOr([], 'host.ip', data)}
                attrName={'host.ip'}
                idPrefix={contextID ? `user-overview-${contextID}` : 'user-overview'}
                isDraggable={isDraggable}
                render={(ip) => (ip != null ? <NetworkDetailsLink ip={ip} /> : getEmptyTagValue())}
              />
            ),
          },
        ],
      ],
      [data, getDefaultRenderer, contextID, isDraggable, firstColumn]
    );
    return (
      <>
        <InspectButtonContainer>
          <OverviewWrapper
            direction={isInDetailsSidePanel ? 'column' : 'row'}
            data-test-subj="user-overview"
          >
            {!isInDetailsSidePanel && (
              <InspectButton queryId={id} title={i18n.INSPECT_TITLE} inspectIndex={0} />
            )}
            {descriptionLists.map((descriptionList, index) => (
              <OverviewDescriptionList descriptionList={descriptionList} key={index} />
            ))}

            {loading && (
              <Loader
                overlay
                overlayBackground={
                  darkMode ? darkTheme.euiPageBackgroundColor : lightTheme.euiPageBackgroundColor
                }
                size="xl"
              />
            )}
          </OverviewWrapper>
        </InspectButtonContainer>
        {userRiskScore && userRiskLevel && (
          <UserRiskOverviewWrapper
            gutterSize={isInDetailsSidePanel ? 'm' : 'none'}
            direction={isInDetailsSidePanel ? 'column' : 'row'}
            data-test-subj="user-risk-overview"
          >
            <EuiFlexItem>
              <DescriptionListStyled listItems={[userRiskScore]} />
            </EuiFlexItem>
            <EuiFlexItem>
              <DescriptionListStyled listItems={[userRiskLevel]} />
            </EuiFlexItem>
          </UserRiskOverviewWrapper>
        )}
      </>
    );
  }
);

UserOverview.displayName = 'UserOverview';
