/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEmpty } from 'lodash/fp';
import { EuiButton, EuiFlexItem, EuiPanel } from '@elastic/eui';
import numeral from '@elastic/numeral';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { useMemo } from 'react';

import { DEFAULT_NUMBER_FORMAT } from '../../../../common/constants';
import { ESQuery } from '../../../../common/typed_json';
import { HeaderSection } from '../../../common/components/header_section';
import { useUiSetting$ } from '../../../common/lib/kibana';
import { manageQuery } from '../../../common/components/page/manage_query';
import {
  ID as OverviewNetworkQueryId,
  OverviewNetworkQuery,
} from '../../containers/overview_network';
import { inputsModel } from '../../../common/store/inputs';
import { getOverviewNetworkStats, OverviewNetworkStats } from '../overview_network_stats';
import { getNetworkUrl } from '../../../common/components/link_to';
import { InspectButtonContainer } from '../../../common/components/inspect';
import { useGetUrlSearch } from '../../../common/components/navigation/use_get_url_search';
import { navTabs } from '../../../app/home/home_navigations';

export interface OverviewNetworkProps {
  startDate: number;
  endDate: number;
  filterQuery?: ESQuery | string;
  setQuery: ({
    id,
    inspect,
    loading,
    refetch,
  }: {
    id: string;
    inspect: inputsModel.InspectQuery | null;
    loading: boolean;
    refetch: inputsModel.Refetch;
  }) => void;
}

const OverviewNetworkStatsManage = manageQuery(OverviewNetworkStats);

const OverviewNetworkComponent: React.FC<OverviewNetworkProps> = ({
  endDate,
  filterQuery,
  startDate,
  setQuery,
}) => {
  const [defaultNumberFormat] = useUiSetting$<string>(DEFAULT_NUMBER_FORMAT);
  const urlSearch = useGetUrlSearch(navTabs.network);
  const networkPageButton = useMemo(
    () => (
      <EuiButton href={getNetworkUrl(urlSearch)}>
        <FormattedMessage
          id="xpack.securitySolution.overview.networkAction"
          defaultMessage="View network"
        />
      </EuiButton>
    ),
    [urlSearch]
  );
  return (
    <EuiFlexItem>
      <InspectButtonContainer>
        <EuiPanel>
          <OverviewNetworkQuery
            data-test-subj="overview-network-query"
            endDate={endDate}
            filterQuery={filterQuery}
            sourceId="default"
            startDate={startDate}
          >
            {({ overviewNetwork, loading, id, inspect, refetch }) => {
              const networkEventsCount = getOverviewNetworkStats(overviewNetwork).reduce(
                (total, stat) => total + stat.count,
                0
              );
              const formattedNetworkEventsCount = numeral(networkEventsCount).format(
                defaultNumberFormat
              );

              return (
                <>
                  <HeaderSection
                    id={OverviewNetworkQueryId}
                    subtitle={
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
                      )
                    }
                    title={
                      <FormattedMessage
                        id="xpack.securitySolution.overview.networkTitle"
                        defaultMessage="Network events"
                      />
                    }
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
              );
            }}
          </OverviewNetworkQuery>
        </EuiPanel>
      </InspectButtonContainer>
    </EuiFlexItem>
  );
};

OverviewNetworkComponent.displayName = 'OverviewNetworkComponent';

export const OverviewNetwork = React.memo(OverviewNetworkComponent);
