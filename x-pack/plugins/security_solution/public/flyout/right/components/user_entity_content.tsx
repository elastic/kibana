/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { getOr } from 'lodash/fp';
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

import { useUserDetails } from '../../../explore/users/containers/users/details';
// import { RiskScoreHeaderTitle } from '../../../explore/components/risk_score/risk_score_onboarding/risk_score_header_title';

const CONTEXT_ID = `flyout-host-entity-overview`;

export interface UserEntityContentProps {
  userName: string;
}

export const UserEntityContent: React.FC<UserEntityContentProps> = ({ userName }) => {
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

  const { data: userRisk, isLicenseValid } = useRiskScore({
    filterQuery,
    riskEntity: RiskScoreEntity.user,
    timerange,
  });

  const [userRiskScore, userRiskLevel] = useMemo(() => {
    const userRiskData = userRisk && userRisk.length > 0 ? userRisk[0] : undefined;

    return [
      {
        title: i18n.USER_RISK_SCORE,
        //   (<RiskScoreHeaderTitle
        //     title={i18n.HOST_RISK_SCORE}
        //     riskScoreEntity={RiskScoreEntity.host}
        //   />),
        description: (
          <>
            {userRiskData
              ? Math.round(userRiskData.user.risk.calculated_score_norm)
              : getEmptyTagValue()}
          </>
        ),
      },
      {
        title: i18n.USER_RISK_CLASSIFICATION,
        //   (<RiskScoreHeaderTitle
        //     title={i18n.USER_RISK_CLASSIFICATION}
        //     riskScoreEntity={RiskScoreEntity.host}
        //   />),
        description: (
          <>
            {userRiskData ? (
              <RiskScore severity={userRiskData.user.risk.calculated_level} />
            ) : (
              <RiskScore severity={RiskSeverity.unknown} />
              // getEmptyTagValue()
            )}
          </>
        ),
      },
    ];
  }, [userRisk]);

  const [loading, { userDetails: data }] = useUserDetails({
    endDate: to,
    userName,
    indexNames: selectedPatterns,
    startDate: from,
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

  return (
    <EuiFlexGroup>
      <EuiFlexItem>
        <OverviewDescriptionList descriptionList={descriptionList} key={'0'} />
      </EuiFlexItem>
      <EuiFlexItem>
        {isLicenseValid && <DescriptionListStyled listItems={[userRiskLevel]} />}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
