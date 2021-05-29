/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import React, { useMemo } from 'react';
import styled from 'styled-components';

import { ENABLE_NEWS_FEED_SETTING, NEWS_FEED_URL_SETTING } from '../../../../common/constants';
import { Filters as RecentTimelinesFilters } from '../recent_timelines/filters';
import { StatefulRecentTimelines } from '../recent_timelines';
import { StatefulNewsFeed } from '../../../common/components/news_feed';
import { FilterMode as RecentTimelinesFilterMode } from '../recent_timelines/types';
import { SidebarHeader } from '../../../common/components/sidebar_header';

import * as i18n from '../../pages/translations';
import { RecentCases } from '../recent_cases';

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
  recentTimelinesFilterBy: RecentTimelinesFilterMode;
  setRecentTimelinesFilterBy: (filterBy: RecentTimelinesFilterMode) => void;
}>(({ recentTimelinesFilterBy, setRecentTimelinesFilterBy }) => {
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
        <RecentCases />
      </EuiFlexItem>

      <Spacer />

      <EuiFlexItem grow={false}>
        <SidebarHeader title={i18n.RECENT_TIMELINES}>{recentTimelinesFilters}</SidebarHeader>
        <StatefulRecentTimelines filterBy={recentTimelinesFilterBy} />
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
});

Sidebar.displayName = 'Sidebar';
