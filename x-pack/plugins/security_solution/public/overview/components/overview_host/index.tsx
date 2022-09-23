/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash/fp';
import { EuiPanel } from '@elastic/eui';
import numeral from '@elastic/numeral';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useMemo, useCallback, useState, useEffect } from 'react';

import { DEFAULT_NUMBER_FORMAT } from '../../../../common/constants';
import type { ESQuery } from '../../../../common/typed_json';
import { ID as OverviewHostQueryId, useHostOverview } from '../../containers/overview_host';
import { HeaderSection } from '../../../common/components/header_section';
import { useUiSetting$ } from '../../../common/lib/kibana';
import { getOverviewHostStats, OverviewHostStats } from '../overview_host_stats';
import { manageQuery } from '../../../common/components/page/manage_query';
import { InspectButtonContainer } from '../../../common/components/inspect';
import { SecuritySolutionLinkButton } from '../../../common/components/links';
import type { GlobalTimeArgs } from '../../../common/containers/use_global_time';
import { SecurityPageName } from '../../../app/types';
import { useQueryToggle } from '../../../common/containers/query_toggle';

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
  const [defaultNumberFormat] = useUiSetting$<string>(DEFAULT_NUMBER_FORMAT);

  const { toggleStatus, setToggleStatus } = useQueryToggle(OverviewHostQueryId);
  const [querySkip, setQuerySkip] = useState(filterQuery === undefined || !toggleStatus);
  useEffect(() => {
    setQuerySkip(filterQuery === undefined || !toggleStatus);
  }, [filterQuery, toggleStatus]);
  const toggleQuery = useCallback(
    (status: boolean) => {
      setToggleStatus(status);
      // toggle on = skipQuery false
      setQuerySkip(!status);
    },
    [setQuerySkip, setToggleStatus]
  );

  const [loading, { overviewHost, id, inspect, refetch }] = useHostOverview({
    endDate,
    filterQuery,
    indexNames,
    startDate,
    skip: querySkip,
  });

  const hostEventsCount = useMemo(
    () => getOverviewHostStats(overviewHost).reduce((total, stat) => total + stat.count, 0),
    [overviewHost]
  );

  const formattedHostEventsCount = useMemo(
    () => numeral(hostEventsCount).format(defaultNumberFormat),
    [defaultNumberFormat, hostEventsCount]
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
    <InspectButtonContainer show={toggleStatus}>
      <EuiPanel hasBorder>
        <HeaderSection
          id={OverviewHostQueryId}
          subtitle={subtitle}
          toggleStatus={toggleStatus}
          toggleQuery={toggleQuery}
          title={title}
          isInspectDisabled={filterQuery === undefined}
        >
          <SecuritySolutionLinkButton deepLinkId={SecurityPageName.hosts}>
            <FormattedMessage
              id="xpack.securitySolution.overview.hostsAction"
              defaultMessage="View hosts"
            />
          </SecuritySolutionLinkButton>
        </HeaderSection>
        {toggleStatus && (
          <OverviewHostStatsManage
            loading={loading}
            data={overviewHost}
            setQuery={setQuery}
            id={id}
            inspect={inspect}
            refetch={refetch}
          />
        )}
      </EuiPanel>
    </InspectButtonContainer>
  );
};

OverviewHostComponent.displayName = 'OverviewHostComponent';

export const OverviewHost = React.memo(OverviewHostComponent);
