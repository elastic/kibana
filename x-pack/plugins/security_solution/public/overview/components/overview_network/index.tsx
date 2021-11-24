/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash/fp';
import { EuiFlexItem, EuiPanel } from '@elastic/eui';
import numeral from '@elastic/numeral';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useMemo, useCallback } from 'react';

import { DEFAULT_NUMBER_FORMAT, APP_UI_ID } from '../../../../common/constants';
import { ESQuery } from '../../../../common/typed_json';
import { HeaderSection } from '../../../common/components/header_section';
import { useUiSetting$, useKibana } from '../../../common/lib/kibana';
import { manageQuery } from '../../../common/components/page/manage_query';
import {
  ID as OverviewNetworkQueryId,
  useNetworkOverview,
} from '../../containers/overview_network';
import { getOverviewNetworkStats, OverviewNetworkStats } from '../overview_network_stats';
import { getNetworkUrl, useFormatUrl } from '../../../common/components/link_to';
import { InspectButtonContainer } from '../../../common/components/inspect';
import { GlobalTimeArgs } from '../../../common/containers/use_global_time';
import { SecurityPageName } from '../../../app/types';
import { LinkButton } from '../../../common/components/links';

export interface OverviewNetworkProps {
  startDate: GlobalTimeArgs['from'];
  endDate: GlobalTimeArgs['to'];
  filterQuery?: ESQuery | string;
  indexNames: string[];
  setQuery: GlobalTimeArgs['setQuery'];
}

const OverviewNetworkStatsManage = manageQuery(OverviewNetworkStats);

const OverviewNetworkComponent: React.FC<OverviewNetworkProps> = ({
  endDate,
  filterQuery,
  indexNames,
  startDate,
  setQuery,
}) => {
  const { formatUrl, search: urlSearch } = useFormatUrl(SecurityPageName.network);
  const { navigateToApp } = useKibana().services.application;
  const [defaultNumberFormat] = useUiSetting$<string>(DEFAULT_NUMBER_FORMAT);

  const [loading, { overviewNetwork, id, inspect, refetch }] = useNetworkOverview({
    endDate,
    filterQuery,
    indexNames,
    startDate,
    skip: filterQuery === undefined,
  });

  const goToNetwork = useCallback(
    (ev) => {
      ev.preventDefault();
      navigateToApp(APP_UI_ID, {
        deepLinkId: SecurityPageName.network,
        path: getNetworkUrl(urlSearch),
      });
    },
    [navigateToApp, urlSearch]
  );

  const networkEventsCount = useMemo(
    () => getOverviewNetworkStats(overviewNetwork).reduce((total, stat) => total + stat.count, 0),
    [overviewNetwork]
  );
  const formattedNetworkEventsCount = useMemo(
    () => numeral(networkEventsCount).format(defaultNumberFormat),
    [defaultNumberFormat, networkEventsCount]
  );

  const networkPageButton = useMemo(
    () => (
      <LinkButton
        data-test-subj="overview-network-go-to-network-page"
        onClick={goToNetwork}
        href={formatUrl(getNetworkUrl())}
      >
        <FormattedMessage
          id="xpack.securitySolution.overview.networkAction"
          defaultMessage="View network"
        />
      </LinkButton>
    ),
    [goToNetwork, formatUrl]
  );

  const title = useMemo(
    () => (
      <FormattedMessage
        id="xpack.securitySolution.overview.networkTitle"
        defaultMessage="Network events"
      />
    ),
    []
  );

  const subtitle = useMemo(
    () =>
      !isEmpty(overviewNetwork) ? (
        <FormattedMessage
          defaultMessage="Showing: {formattedNetworkEventsCount} {networkEventsCount, plural, one {event} other {events}}"
          id="xpack.securitySolution.overview.overviewNetwork.networkSubtitle"
          values={{
            formattedNetworkEventsCount,
            networkEventsCount,
          }}
        />
      ) : (
        <>{''}</>
      ),
    [formattedNetworkEventsCount, networkEventsCount, overviewNetwork]
  );

  return (
    <EuiFlexItem>
      <InspectButtonContainer>
        <EuiPanel hasBorder data-test-subj="overview-network-query">
          <>
            <HeaderSection
              id={OverviewNetworkQueryId}
              subtitle={subtitle}
              title={title}
              isInspectDisabled={filterQuery === undefined}
            >
              {networkPageButton}
            </HeaderSection>

            <OverviewNetworkStatsManage
              loading={loading}
              data={overviewNetwork}
              id={id}
              inspect={inspect}
              setQuery={setQuery}
              refetch={refetch}
            />
          </>
        </EuiPanel>
      </InspectButtonContainer>
    </EuiFlexItem>
  );
};

OverviewNetworkComponent.displayName = 'OverviewNetworkComponent';

export const OverviewNetwork = React.memo(OverviewNetworkComponent);
