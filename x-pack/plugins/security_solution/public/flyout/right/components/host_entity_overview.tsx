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
import { useHostDetails } from '../../../explore/hosts/containers/hosts/details';
import * as i18n from '../../../overview/components/host_overview/translations';
import { TECHNICAL_PREVIEW_TITLE, TECHNICAL_PREVIEW_MESSAGE } from './translations';
import {
  TECHNICAL_PREVIEW_ICON_TEST_ID,
  ENTITIES_HOST_OVERVIEW_TEST_ID,
  ENTITIES_HOST_OVERVIEW_IP_TEST_ID,
  ENTITIES_HOST_OVERVIEW_RISK_LEVEL_TEST_ID,
} from './test_ids';

const StyledEuiBetaBadge = styled(EuiBetaBadge)`
  margin-left: ${({ theme }) => theme.eui.euiSizeXS};
`;
const CONTEXT_ID = `flyout-host-entity-overview`;

export interface HostEntityOverviewProps {
  /**
   * Host name for looking up host related ip addresses and risk classification
   */
  hostName: string;
}

/**
 * Host preview content for the entities preview in right flyout. It contains ip addresses and risk classification
 */
export const HostEntityOverview: React.FC<HostEntityOverviewProps> = ({ hostName }) => {
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

  const { data: hostRisk, isAuthorized } = useRiskScore({
    filterQuery,
    riskEntity: RiskScoreEntity.host,
    skip: hostName == null,
    timerange,
  });

  const [_, { hostDetails }] = useHostDetails({
    hostName,
    indexNames: selectedPatterns,
    startDate: from,
    endDate: to,
  });

  const [hostRiskLevel] = useMemo(() => {
    const hostRiskData = hostRisk && hostRisk.length > 0 ? hostRisk[0] : undefined;
    return [
      {
        title: (
          <>
            {i18n.HOST_RISK_CLASSIFICATION}
            <StyledEuiBetaBadge
              label={TECHNICAL_PREVIEW_TITLE}
              size="s"
              alignment="baseline"
              iconType="beaker"
              tooltipContent={TECHNICAL_PREVIEW_MESSAGE}
              tooltipPosition="bottom"
              data-test-subj={TECHNICAL_PREVIEW_ICON_TEST_ID}
            />
          </>
        ),
        description: (
          <>
            {hostRiskData ? (
              <RiskScore severity={hostRiskData.host.risk.calculated_level} />
            ) : (
              <RiskScore severity={RiskSeverity.unknown} />
            )}
          </>
        ),
      },
    ];
  }, [hostRisk]);

  const descriptionList: DescriptionList[] = useMemo(
    () => [
      {
        title: i18n.IP_ADDRESSES,
        description: (
          <DefaultFieldRenderer
            rowItems={getOr([], 'host.ip', hostDetails)}
            attrName={'host.ip'}
            idPrefix={CONTEXT_ID}
            isDraggable={false}
            render={(ip) => (ip != null ? <NetworkDetailsLink ip={ip} /> : getEmptyTagValue())}
          />
        ),
      },
    ],
    [hostDetails]
  );

  return (
    <EuiFlexGroup data-test-subj={ENTITIES_HOST_OVERVIEW_TEST_ID}>
      <EuiFlexItem>
        <OverviewDescriptionList
          dataTestSubj={ENTITIES_HOST_OVERVIEW_IP_TEST_ID}
          descriptionList={descriptionList}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        {isAuthorized && (
          <DescriptionListStyled
            data-test-subj={ENTITIES_HOST_OVERVIEW_RISK_LEVEL_TEST_ID}
            listItems={[hostRiskLevel]}
          />
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

HostEntityOverview.displayName = 'HostEntityOverview';
