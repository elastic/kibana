/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import React, { useMemo } from 'react';
import styled from 'styled-components';

import { ENABLE_NEWS_FEED_SETTING, NEWS_FEED_URL_SETTING } from '../../../../common/constants';
import { Filters as RecentCasesFilters } from '../recent_cases/filters';
import { Filters as RecentTimelinesFilters } from '../recent_timelines/filters';
import { StatefulRecentCases } from '../recent_cases';
import { StatefulRecentTimelines } from '../recent_timelines';
import { StatefulNewsFeed } from '../../../common/components/news_feed';
import { FilterMode as RecentTimelinesFilterMode } from '../recent_timelines/types';
import { FilterMode as RecentCasesFilterMode } from '../recent_cases/types';
import { DEFAULT_FILTER_OPTIONS } from '../../../cases/containers/use_get_cases';
import { SidebarHeader } from '../../../common/components/sidebar_header';
import { useCurrentUser } from '../../../common/lib/kibana';
import { useApolloClient } from '../../../common/utils/apollo_context';

import * as i18n from '../../pages/translations';

const SidebarFlexGroup = styled(EuiFlexGroup)`
  width: 305px;
`;

const SidebarSpacerComponent = () => (
  <EuiFlexItem grow={false}>
    <EuiSpacer size="xxl" />
  </EuiFlexItem>
);

SidebarSpacerComponent.displayName = 'SidebarSpacerComponent';
const Spacer = React.memo(SidebarSpacerComponent);

export const Sidebar = React.memo<{
  recentCasesFilterBy: RecentCasesFilterMode;
  recentTimelinesFilterBy: RecentTimelinesFilterMode;
  setRecentCasesFilterBy: (filterBy: RecentCasesFilterMode) => void;
  setRecentTimelinesFilterBy: (filterBy: RecentTimelinesFilterMode) => void;
}>(
  ({
    recentCasesFilterBy,
    recentTimelinesFilterBy,
    setRecentCasesFilterBy,
    setRecentTimelinesFilterBy,
  }) => {
    const currentUser = useCurrentUser();
    const apolloClient = useApolloClient();
    const recentCasesFilters = useMemo(
      () => (
        <RecentCasesFilters
          filterBy={recentCasesFilterBy}
          setFilterBy={setRecentCasesFilterBy}
          showMyRecentlyReported={currentUser != null}
        />
      ),
      [currentUser, recentCasesFilterBy, setRecentCasesFilterBy]
    );
    const recentCasesFilterOptions = useMemo(
      () =>
        recentCasesFilterBy === 'myRecentlyReported' && currentUser != null
          ? {
              ...DEFAULT_FILTER_OPTIONS,
              reporters: [
                {
                  email: currentUser.email,
                  full_name: currentUser.fullName,
                  username: currentUser.username,
                },
              ],
            }
          : DEFAULT_FILTER_OPTIONS,
      [currentUser, recentCasesFilterBy]
    );
    const recentTimelinesFilters = useMemo(
      () => (
        <RecentTimelinesFilters
          filterBy={recentTimelinesFilterBy}
          setFilterBy={setRecentTimelinesFilterBy}
        />
      ),
      [recentTimelinesFilterBy, setRecentTimelinesFilterBy]
    );

    return (
      <SidebarFlexGroup direction="column" gutterSize="none">
        <EuiFlexItem grow={false}>
          <SidebarHeader title={i18n.RECENT_CASES}>{recentCasesFilters}</SidebarHeader>
          <StatefulRecentCases filterOptions={recentCasesFilterOptions} />
        </EuiFlexItem>

        <Spacer />

        <EuiFlexItem grow={false}>
          <SidebarHeader title={i18n.RECENT_TIMELINES}>{recentTimelinesFilters}</SidebarHeader>
          <StatefulRecentTimelines
            apolloClient={apolloClient!}
            filterBy={recentTimelinesFilterBy}
          />
        </EuiFlexItem>

        <Spacer />

        <EuiFlexItem grow={false}>
          <StatefulNewsFeed
            enableNewsFeedSetting={ENABLE_NEWS_FEED_SETTING}
            newsFeedSetting={NEWS_FEED_URL_SETTING}
          />
        </EuiFlexItem>
      </SidebarFlexGroup>
    );
  }
);

Sidebar.displayName = 'Sidebar';
