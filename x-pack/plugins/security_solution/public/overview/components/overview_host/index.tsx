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
import { ID as OverviewHostQueryId, useHostOverview } from '../../containers/overview_host';
import { HeaderSection } from '../../../common/components/header_section';
import { useUiSetting$, useKibana } from '../../../common/lib/kibana';
import { getHostDetailsUrl, useFormatUrl } from '../../../common/components/link_to';
import { getOverviewHostStats, OverviewHostStats } from '../overview_host_stats';
import { manageQuery } from '../../../common/components/page/manage_query';
import { InspectButtonContainer } from '../../../common/components/inspect';
import { GlobalTimeArgs } from '../../../common/containers/use_global_time';
import { SecurityPageName } from '../../../app/types';
import { LinkButton } from '../../../common/components/links';

export interface OwnProps {
  startDate: GlobalTimeArgs['from'];
  endDate: GlobalTimeArgs['to'];
  indexNames: string[];
  filterQuery?: ESQuery | string;
  setQuery: GlobalTimeArgs['setQuery'];
}

const OverviewHostStatsManage = manageQuery(OverviewHostStats);
export type OverviewHostProps = OwnProps;

const OverviewHostComponent: React.FC<OverviewHostProps> = ({
  endDate,
  filterQuery,
  indexNames,
  startDate,
  setQuery,
}) => {
  const { formatUrl, search: urlSearch } = useFormatUrl(SecurityPageName.hosts);
  const { navigateToApp } = useKibana().services.application;
  const [defaultNumberFormat] = useUiSetting$<string>(DEFAULT_NUMBER_FORMAT);

  const [loading, { overviewHost, id, inspect, refetch }] = useHostOverview({
    endDate,
    filterQuery,
    indexNames,
    startDate,
    skip: filterQuery === undefined,
  });

  const goToHost = useCallback(
    (ev) => {
      ev.preventDefault();
      navigateToApp(APP_UI_ID, {
        deepLinkId: SecurityPageName.hosts,
        path: getHostDetailsUrl('allHosts', urlSearch),
      });
    },
    [navigateToApp, urlSearch]
  );

  const hostEventsCount = useMemo(
    () => getOverviewHostStats(overviewHost).reduce((total, stat) => total + stat.count, 0),
    [overviewHost]
  );

  const formattedHostEventsCount = useMemo(
    () => numeral(hostEventsCount).format(defaultNumberFormat),
    [defaultNumberFormat, hostEventsCount]
  );

  const hostPageButton = useMemo(
    () => (
      <LinkButton onClick={goToHost} href={formatUrl('/allHosts')}>
        <FormattedMessage
          id="xpack.securitySolution.overview.hostsAction"
          defaultMessage="View hosts"
        />
      </LinkButton>
    ),
    [goToHost, formatUrl]
  );

  const title = useMemo(
    () => (
      <FormattedMessage
        id="xpack.securitySolution.overview.hostsTitle"
        defaultMessage="Host events"
      />
    ),
    []
  );

  const subtitle = useMemo(
    () =>
      !isEmpty(overviewHost) ? (
        <FormattedMessage
          defaultMessage="Showing: {formattedHostEventsCount} {hostEventsCount, plural, one {event} other {events}}"
          id="xpack.securitySolution.overview.overviewHost.hostsSubtitle"
          values={{
            hostEventsCount,
            formattedHostEventsCount,
          }}
        />
      ) : (
        <>{''}</>
      ),
    [formattedHostEventsCount, hostEventsCount, overviewHost]
  );

  return (
    <EuiFlexItem>
      <InspectButtonContainer>
        <EuiPanel hasBorder>
          <HeaderSection
            id={OverviewHostQueryId}
            subtitle={subtitle}
            title={title}
            isInspectDisabled={filterQuery === undefined}
          >
            <>{hostPageButton}</>
          </HeaderSection>

          <OverviewHostStatsManage
            loading={loading}
            data={overviewHost}
            setQuery={setQuery}
            id={id}
            inspect={inspect}
            refetch={refetch}
          />
        </EuiPanel>
      </InspectButtonContainer>
    </EuiFlexItem>
  );
};

OverviewHostComponent.displayName = 'OverviewHostComponent';

export const OverviewHost = React.memo(OverviewHostComponent);
