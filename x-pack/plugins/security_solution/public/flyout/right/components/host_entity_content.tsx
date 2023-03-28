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
  buildHostNamesFilter,
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
import * as i18n from '../../../overview/components/host_overview/translations';

import { useHostDetails } from '../../../explore/hosts/containers/hosts/details';
// import { RiskScoreHeaderTitle } from '../../../explore/components/risk_score/risk_score_onboarding/risk_score_header_title';

const CONTEXT_ID = `flyout-user-entity-overview`;

export interface HostEntityContentProps {
  hostName: string;
}

export const HostEntityContent: React.FC<HostEntityContentProps> = ({ hostName }) => {
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
    () => (hostName ? buildHostNamesFilter([hostName]) : undefined),
    [hostName]
  );

  const { data: hostRisk, isLicenseValid } = useRiskScore({
    filterQuery,
    riskEntity: RiskScoreEntity.host,
    skip: hostName == null,
    timerange,
  });

  const [hostRiskScore, hostRiskLevel] = useMemo(() => {
    const hostRiskData = hostRisk && hostRisk.length > 0 ? hostRisk[0] : undefined;
    return [
      {
        title: i18n.HOST_RISK_SCORE,
        //   <RiskScoreHeaderTitle
        //     title={i18n.HOST_RISK_SCORE}
        //     riskScoreEntity={RiskScoreEntity.host}
        //   />
        description: (
          <>
            {hostRiskData
              ? Math.round(hostRiskData.host.risk.calculated_score_norm)
              : getEmptyTagValue()}
          </>
        ),
      },
      {
        title: i18n.HOST_RISK_CLASSIFICATION,
        // (<RiskScoreHeaderTitle
        //     title={i18n.HOST_RISK_CLASSIFICATION}
        //     riskScoreEntity={RiskScoreEntity.host}
        //   />),
        description: (
          <>
            {hostRiskData ? (
              <RiskScore severity={hostRiskData.host.risk.calculated_level} />
            ) : (
              <RiskScore severity={RiskSeverity.unknown} />
              // getEmptyTagValue()
            )}
          </>
        ),
      },
    ];
  }, [hostRisk]);

  const [loading, { hostDetails: data }] = useHostDetails({
    endDate: to,
    hostName,
    indexNames: selectedPatterns,
    startDate: from,
  });

  const descriptionList: DescriptionList[] = useMemo(
    () => [
      {
        title: i18n.IP_ADDRESSES,
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
        {isLicenseValid && <DescriptionListStyled listItems={[hostRiskLevel]} />}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
