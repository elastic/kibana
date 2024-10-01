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
  EuiText,
  EuiIcon,
  useEuiTheme,
  useEuiFontSize,
  EuiSkeletonText,
} from '@elastic/eui';
import { css } from '@emotion/css';
import { getOr } from 'lodash/fp';
import { i18n } from '@kbn/i18n';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import { HOST_NAME_FIELD_NAME } from '../../../../timelines/components/timeline/body/renderers/constants';
import { useRiskScore } from '../../../../entity_analytics/api/hooks/use_risk_score';
import { useDocumentDetailsContext } from '../../shared/context';
import type { DescriptionList } from '../../../../../common/utility_types';
import {
  FirstLastSeen,
  FirstLastSeenType,
} from '../../../../common/components/first_last_seen/first_last_seen';
import { buildHostNamesFilter, RiskScoreEntity } from '../../../../../common/search_strategy';
import { getEmptyTagValue } from '../../../../common/components/empty_value';
import { DescriptionListStyled } from '../../../../common/components/page';
import { OverviewDescriptionList } from '../../../../common/components/overview_description_list';
import { RiskScoreLevel } from '../../../../entity_analytics/components/severity/common';
import { useSourcererDataView } from '../../../../sourcerer/containers';
import { useGlobalTime } from '../../../../common/containers/use_global_time';
import { useHostDetails } from '../../../../explore/hosts/containers/hosts/details';
import { getField } from '../../shared/utils';
import { CellActions } from '../../shared/components/cell_actions';
import {
  FAMILY,
  LAST_SEEN,
  HOST_RISK_LEVEL,
} from '../../../../overview/components/host_overview/translations';
import { ENTITIES_TAB_ID } from '../../left/components/entities_details';
import {
  ENTITIES_HOST_OVERVIEW_TEST_ID,
  ENTITIES_HOST_OVERVIEW_OS_FAMILY_TEST_ID,
  ENTITIES_HOST_OVERVIEW_LAST_SEEN_TEST_ID,
  ENTITIES_HOST_OVERVIEW_RISK_LEVEL_TEST_ID,
  ENTITIES_HOST_OVERVIEW_LINK_TEST_ID,
  ENTITIES_HOST_OVERVIEW_LOADING_TEST_ID,
} from './test_ids';
import { DocumentDetailsLeftPanelKey } from '../../shared/constants/panel_keys';
import { LeftPanelInsightsTab } from '../../left';
import { RiskScoreDocTooltip } from '../../../../overview/components/common';
import { PreviewLink } from '../../../shared/components/preview_link';

const HOST_ICON = 'storage';

export interface HostEntityOverviewProps {
  /**
   * Host name for looking up host related ip addresses and risk level
   */
  hostName: string;
}

export const HOST_PREVIEW_BANNER = {
  title: i18n.translate('xpack.securitySolution.flyout.right.host.hostPreviewTitle', {
    defaultMessage: 'Preview host details',
  }),
  backgroundColor: 'warning',
  textColor: 'warning',
};

/**
 * Host preview content for the entities preview in right flyout. It contains ip addresses and risk level
 */
export const HostEntityOverview: React.FC<HostEntityOverviewProps> = ({ hostName }) => {
  const { eventId, indexName, scopeId } = useDocumentDetailsContext();
  const { openLeftPanel } = useExpandableFlyoutApi();
  const isPreviewEnabled = !useIsExperimentalFeatureEnabled('entityAlertPreviewDisabled');

  const goToEntitiesTab = useCallback(() => {
    openLeftPanel({
      id: DocumentDetailsLeftPanelKey,
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

  const {
    data: hostRisk,
    isAuthorized,
    loading: isRiskScoreLoading,
  } = useRiskScore({
    filterQuery,
    riskEntity: RiskScoreEntity.host,
    skip: hostName == null,
    timerange,
  });

  const [isHostDetailsLoading, { hostDetails }] = useHostDetails({
    hostName,
    indexNames: selectedPatterns,
    startDate: from,
    endDate: to,
  });

  const hostOSFamilyValue = useMemo(
    () => getField(getOr([], 'host.os.family', hostDetails)),
    [hostDetails]
  );
  const hostOSFamily: DescriptionList[] = useMemo(
    () => [
      {
        title: FAMILY,
        description: hostOSFamilyValue ? (
          <CellActions field={'host.os.family'} value={hostOSFamilyValue}>
            {hostOSFamilyValue}
          </CellActions>
        ) : (
          getEmptyTagValue()
        ),
      },
    ],
    [hostOSFamilyValue]
  );

  const hostLastSeen: DescriptionList[] = useMemo(
    () => [
      {
        title: LAST_SEEN,
        description: (
          <FirstLastSeen
            indexPatterns={selectedPatterns}
            field={HOST_NAME_FIELD_NAME}
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
        title: (
          <EuiFlexGroup alignItems="flexEnd" gutterSize="none" responsive={false}>
            <EuiFlexItem grow={false}>{HOST_RISK_LEVEL}</EuiFlexItem>
            <EuiFlexItem grow={false}>
              <RiskScoreDocTooltip />
            </EuiFlexItem>
          </EuiFlexGroup>
        ),
        description: (
          <>
            {hostRiskData ? (
              <RiskScoreLevel severity={hostRiskData.host.risk.calculated_level} />
            ) : (
              getEmptyTagValue()
            )}
          </>
        ),
      },
    ];
  }, [hostRisk]);

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="s"
      responsive={false}
      data-test-subj={ENTITIES_HOST_OVERVIEW_TEST_ID}
    >
      <EuiFlexItem>
        <EuiFlexGroup gutterSize="m" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiIcon type={HOST_ICON} />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            {isPreviewEnabled ? (
              <PreviewLink
                field={HOST_NAME_FIELD_NAME}
                value={hostName}
                scopeId={scopeId}
                data-test-subj={ENTITIES_HOST_OVERVIEW_LINK_TEST_ID}
              >
                <EuiText
                  css={css`
                    font-size: ${xsFontSize};
                    font-weight: ${euiTheme.font.weight.bold};
                  `}
                >
                  {hostName}
                </EuiText>
              </PreviewLink>
            ) : (
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
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      {isRiskScoreLoading || isHostDetailsLoading ? (
        <EuiSkeletonText
          data-test-subj={ENTITIES_HOST_OVERVIEW_LOADING_TEST_ID}
          contentAriaLabel={i18n.translate(
            'xpack.securitySolution.flyout.right.insights.entities.hostLoadingAriaLabel',
            { defaultMessage: 'host overview' }
          )}
        />
      ) : (
        <EuiFlexItem>
          <EuiFlexGroup responsive={false}>
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
      )}
    </EuiFlexGroup>
  );
};

HostEntityOverview.displayName = 'HostEntityOverview';
