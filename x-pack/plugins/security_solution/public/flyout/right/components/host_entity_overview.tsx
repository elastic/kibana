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
  EuiLink,
  EuiIcon,
  useEuiTheme,
  useEuiFontSize,
} from '@elastic/eui';
import { css } from '@emotion/css';
import { getOr } from 'lodash/fp';
import { useExpandableFlyoutContext } from '@kbn/expandable-flyout';
import { useRightPanelContext } from '../context';
import type { DescriptionList } from '../../../../common/utility_types';
import {
  FirstLastSeen,
  FirstLastSeenType,
} from '../../../common/components/first_last_seen/first_last_seen';
import {
  buildHostNamesFilter,
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
import { useHostDetails } from '../../../explore/hosts/containers/hosts/details';
import * as i18n from '../../../overview/components/host_overview/translations';
import { ENTITIES_TAB_ID } from '../../left/components/entities_details';
import {
  ENTITIES_HOST_OVERVIEW_TEST_ID,
  ENTITIES_HOST_OVERVIEW_OS_FAMILY_TEST_ID,
  ENTITIES_HOST_OVERVIEW_LAST_SEEN_TEST_ID,
  ENTITIES_HOST_OVERVIEW_RISK_LEVEL_TEST_ID,
  ENTITIES_HOST_OVERVIEW_LINK_TEST_ID,
} from './test_ids';
import { LeftPanelInsightsTab, LeftPanelKey } from '../../left';

const HOST_ICON = 'storage';
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

  const hostOSFamily: DescriptionList[] = useMemo(
    () => [
      {
        title: i18n.FAMILY,
        description: (
          <DefaultFieldRenderer
            rowItems={getOr([], 'host.os.family', hostDetails)}
            attrName={'host.os.family'}
            idPrefix={CONTEXT_ID}
            isDraggable={false}
          />
        ),
      },
    ],
    [hostDetails]
  );

  const hostLastSeen: DescriptionList[] = useMemo(
    () => [
      {
        title: i18n.LAST_SEEN,
        description: (
          <FirstLastSeen
            indexPatterns={selectedPatterns}
            field={'host.name'}
            value={hostName}
            type={FirstLastSeenType.LAST_SEEN}
          />
        ),
      },
    ],
    [hostName, selectedPatterns]
  );

  const { euiTheme } = useEuiTheme();
  const xsFontSize = useEuiFontSize('xs').fontSize;

  const [hostRiskLevel] = useMemo(() => {
    const hostRiskData = hostRisk && hostRisk.length > 0 ? hostRisk[0] : undefined;
    return [
      {
        title: i18n.HOST_RISK_CLASSIFICATION,
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

  return (
    <EuiFlexGroup direction="column" gutterSize="s" data-test-subj={ENTITIES_HOST_OVERVIEW_TEST_ID}>
      <EuiFlexItem>
        <EuiFlexGroup gutterSize="m">
          <EuiFlexItem grow={false}>
            <EuiIcon type={HOST_ICON} />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiLink
              data-test-subj={ENTITIES_HOST_OVERVIEW_LINK_TEST_ID}
              css={css`
                font-size: ${xsFontSize};
                font-weight: ${euiTheme.font.weight.bold};
              `}
              onClick={goToEntitiesTab}
            >
              {hostName}
            </EuiLink>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFlexGroup>
          <EuiFlexItem>
            <OverviewDescriptionList
              dataTestSubj={ENTITIES_HOST_OVERVIEW_OS_FAMILY_TEST_ID}
              descriptionList={hostOSFamily}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            {isAuthorized ? (
              <DescriptionListStyled
                data-test-subj={ENTITIES_HOST_OVERVIEW_RISK_LEVEL_TEST_ID}
                listItems={[hostRiskLevel]}
              />
            ) : (
              <OverviewDescriptionList
                dataTestSubj={ENTITIES_HOST_OVERVIEW_LAST_SEEN_TEST_ID}
                descriptionList={hostLastSeen}
              />
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

HostEntityOverview.displayName = 'HostEntityOverview';
