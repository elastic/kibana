/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  useEuiTheme,
  useEuiFontSize,
} from '@elastic/eui';
import { css } from '@emotion/css';
import { getOr } from 'lodash/fp';
import { useExpandableFlyoutContext } from '@kbn/expandable-flyout';
import { LeftPanelInsightsTab, LeftPanelKey } from '../../left';
import { ENTITIES_TAB_ID } from '../../left/components/entities_details';
import { useRightPanelContext } from '../context';
import type { DescriptionList } from '../../../../common/utility_types';
import {
  FirstLastSeen,
  FirstLastSeenType,
} from '../../../common/components/first_last_seen/first_last_seen';
import {
  buildUserNamesFilter,
  RiskScoreEntity,
  RiskSeverity,
} from '../../../../common/search_strategy';
import { DefaultFieldRenderer } from '../../../timelines/components/field_renderers/field_renderers';
import { DescriptionListStyled } from '../../../common/components/page';
import { OverviewDescriptionList } from '../../../common/components/overview_description_list';
import { RiskScore } from '../../../explore/components/risk_score/severity/common';
import { useSourcererDataView } from '../../../common/containers/sourcerer';
import { useGlobalTime } from '../../../common/containers/use_global_time';
import { useRiskScore } from '../../../explore/containers/risk_score';
import * as i18n from '../../../overview/components/user_overview/translations';
import {
  ENTITIES_USER_OVERVIEW_TEST_ID,
  ENTITIES_USER_OVERVIEW_DOMAIN_TEST_ID,
  ENTITIES_USER_OVERVIEW_LAST_SEEN_TEST_ID,
  ENTITIES_USER_OVERVIEW_RISK_LEVEL_TEST_ID,
  ENTITIES_USER_OVERVIEW_LINK_TEST_ID,
} from './test_ids';
import { useObservedUserDetails } from '../../../explore/users/containers/users/observed_details';

const USER_ICON = 'user';
const CONTEXT_ID = `flyout-user-entity-overview`;

export interface UserEntityOverviewProps {
  /**
   * User name for looking up user related ip addresses and risk classification
   */
  userName: string;
}

/**
 * User preview content for the entities preview in right flyout. It contains ip addresses and risk classification
 */
export const UserEntityOverview: React.FC<UserEntityOverviewProps> = ({ userName }) => {
  const { eventId, indexName, scopeId } = useRightPanelContext();
  const { openLeftPanel } = useExpandableFlyoutContext();
  const goToEntitiesTab = useCallback(() => {
    openLeftPanel({
      id: LeftPanelKey,
      path: { tab: LeftPanelInsightsTab, subTab: ENTITIES_TAB_ID },
      params: {
        id: eventId,
        indexName,
        scopeId,
      },
    });
  }, [eventId, openLeftPanel, indexName, scopeId]);

  const { from, to } = useGlobalTime();
  const { selectedPatterns } = useSourcererDataView();

  const timerange = useMemo(
    () => ({
      from,
      to,
    }),
    [from, to]
  );

  const filterQuery = useMemo(
    () => (userName ? buildUserNamesFilter([userName]) : undefined),
    [userName]
  );
  const [_, { userDetails }] = useObservedUserDetails({
    endDate: to,
    userName,
    indexNames: selectedPatterns,
    startDate: from,
  });

  const { data: userRisk, isAuthorized } = useRiskScore({
    filterQuery,
    riskEntity: RiskScoreEntity.user,
    timerange,
  });

  const userDomain: DescriptionList[] = useMemo(
    () => [
      {
        title: i18n.USER_DOMAIN,
        description: (
          <DefaultFieldRenderer
            rowItems={getOr([], 'user.domain', userDetails)}
            attrName={'domain'}
            idPrefix={CONTEXT_ID}
            isDraggable={false}
          />
        ),
      },
    ],
    [userDetails]
  );

  const userLastSeen: DescriptionList[] = useMemo(
    () => [
      {
        title: i18n.LAST_SEEN,
        description: (
          <FirstLastSeen
            indexPatterns={selectedPatterns}
            field={'user.name'}
            value={userName}
            type={FirstLastSeenType.LAST_SEEN}
          />
        ),
      },
    ],
    [userName, selectedPatterns]
  );

  const { euiTheme } = useEuiTheme();
  const xsFontSize = useEuiFontSize('xs').fontSize;

  const [userRiskLevel] = useMemo(() => {
    const userRiskData = userRisk && userRisk.length > 0 ? userRisk[0] : undefined;

    return [
      {
        title: i18n.USER_RISK_CLASSIFICATION,
        description: (
          <>
            {userRiskData ? (
              <RiskScore severity={userRiskData.user.risk.calculated_level} />
            ) : (
              <RiskScore severity={RiskSeverity.unknown} />
            )}
          </>
        ),
      },
    ];
  }, [userRisk]);

  return (
    <EuiFlexGroup direction="column" gutterSize="s" data-test-subj={ENTITIES_USER_OVERVIEW_TEST_ID}>
      <EuiFlexItem>
        <EuiFlexGroup gutterSize="m">
          <EuiFlexItem grow={false}>
            <EuiIcon type={USER_ICON} />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiLink
              data-test-subj={ENTITIES_USER_OVERVIEW_LINK_TEST_ID}
              css={css`
                font-size: ${xsFontSize};
                font-weight: ${euiTheme.font.weight.bold};
              `}
              onClick={goToEntitiesTab}
            >
              {userName}
            </EuiLink>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFlexGroup>
          <EuiFlexItem>
            <OverviewDescriptionList
              dataTestSubj={ENTITIES_USER_OVERVIEW_DOMAIN_TEST_ID}
              descriptionList={userDomain}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            {isAuthorized ? (
              <DescriptionListStyled
                data-test-subj={ENTITIES_USER_OVERVIEW_RISK_LEVEL_TEST_ID}
                listItems={[userRiskLevel]}
              />
            ) : (
              <OverviewDescriptionList
                dataTestSubj={ENTITIES_USER_OVERVIEW_LAST_SEEN_TEST_ID}
                descriptionList={userLastSeen}
              />
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

UserEntityOverview.displayName = 'UserEntityOverview';
