/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiBetaBadge } from '@elastic/eui';
import { getOr } from 'lodash/fp';
import styled from 'styled-components';
import type { DescriptionList } from '../../../../common/utility_types';
import {
  buildUserNamesFilter,
  RiskScoreEntity,
  RiskSeverity,
} from '../../../../common/search_strategy';
import { DefaultFieldRenderer } from '../../../timelines/components/field_renderers/field_renderers';
import { NetworkDetailsLink } from '../../../common/components/links';
import { DescriptionListStyled } from '../../../common/components/page';
import { OverviewDescriptionList } from '../../../common/components/overview_description_list';
import { RiskScore } from '../../../explore/components/risk_score/severity/common';
import { getEmptyTagValue } from '../../../common/components/empty_value';
import { useSourcererDataView } from '../../../common/containers/sourcerer';
import { useGlobalTime } from '../../../common/containers/use_global_time';
import { useRiskScore } from '../../../explore/containers/risk_score';
import * as i18n from '../../../overview/components/user_overview/translations';
import { TECHNICAL_PREVIEW_TITLE, TECHNICAL_PREVIEW_MESSAGE } from './translations';
import {
  TECHNICAL_PREVIEW_ICON_TEST_ID,
  ENTITIES_USER_OVERVIEW_TEST_ID,
  ENTITIES_USER_OVERVIEW_IP_TEST_ID,
  ENTITIES_USER_OVERVIEW_RISK_LEVEL_TEST_ID,
} from './test_ids';
import { useObservedUserDetails } from '../../../explore/users/containers/users/observed_details';

const StyledEuiBetaBadge = styled(EuiBetaBadge)`
  margin-left: ${({ theme }) => theme.eui.euiSizeXS};
`;

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
  const [_, { userDetails: data }] = useObservedUserDetails({
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

  const descriptionList: DescriptionList[] = useMemo(
    () => [
      {
        title: i18n.HOST_IP,
        description: (
          <DefaultFieldRenderer
            rowItems={getOr([], 'host.ip', data)}
            attrName={'host.ip'}
            idPrefix={CONTEXT_ID}
            isDraggable={false}
            render={(ip) => (ip != null ? <NetworkDetailsLink ip={ip} /> : getEmptyTagValue())}
          />
        ),
      },
    ],
    [data]
  );

  const [userRiskLevel] = useMemo(() => {
    const userRiskData = userRisk && userRisk.length > 0 ? userRisk[0] : undefined;

    return [
      {
        title: (
          <>
            {i18n.USER_RISK_CLASSIFICATION}
            <StyledEuiBetaBadge
              label={TECHNICAL_PREVIEW_TITLE}
              size="s"
              iconType="beaker"
              tooltipContent={TECHNICAL_PREVIEW_MESSAGE}
              tooltipPosition="bottom"
              data-test-subj={TECHNICAL_PREVIEW_ICON_TEST_ID}
            />
          </>
        ),

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
    <EuiFlexGroup data-test-subj={ENTITIES_USER_OVERVIEW_TEST_ID}>
      <EuiFlexItem>
        <OverviewDescriptionList
          dataTestSubj={ENTITIES_USER_OVERVIEW_IP_TEST_ID}
          descriptionList={descriptionList}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        {isAuthorized && (
          <DescriptionListStyled
            data-test-subj={ENTITIES_USER_OVERVIEW_RISK_LEVEL_TEST_ID}
            listItems={[userRiskLevel]}
          />
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

UserEntityOverview.displayName = 'UserEntityOverview';
