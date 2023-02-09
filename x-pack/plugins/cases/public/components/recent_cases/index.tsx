/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiHorizontalRule, EuiText, EuiTitle } from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';

import { QueryClientProvider } from '@tanstack/react-query';
import * as i18n from './translations';
import { LinkAnchor } from '../links';
import { RecentCasesFilters } from './filters';
import { RecentCasesComp } from './recent_cases';
import type { FilterMode as RecentCasesFilterMode } from './types';
import type { FilterOptions } from '../../containers/types';
import { useCurrentUser } from '../../common/lib/kibana';
import { useAllCasesNavigation } from '../../common/navigation';
import { casesQueryClient } from '../cases_context/query_client';
import { useGetCurrentUserProfile } from '../../containers/user_profiles/use_get_current_user_profile';
import { getReporterFilter, getAssigneeFilter } from './get_filter_options';

export interface RecentCasesProps {
  maxCasesToShow: number;
}

const RecentCases = React.memo((props: RecentCasesProps) => {
  return (
    <QueryClientProvider client={casesQueryClient}>
      <RecentCasesWithoutQueryProvider {...props} />
    </QueryClientProvider>
  );
});

RecentCases.displayName = 'RecentCases';

// eslint-disable-next-line import/no-default-export
export { RecentCases as default };

const RecentCasesWithoutQueryProvider = React.memo(({ maxCasesToShow }: RecentCasesProps) => {
  const currentUser = useCurrentUser();
  const { data: currentUserProfile, isLoading: isLoadingCurrentUserProfile } =
    useGetCurrentUserProfile();
  const { getAllCasesUrl, navigateToAllCases } = useAllCasesNavigation();

  const [recentCasesFilterBy, setRecentCasesFilterBy] =
    useState<RecentCasesFilterMode>('recentlyCreated');

  const navigateToAllCasesClick = useCallback(
    (e) => {
      e.preventDefault();
      navigateToAllCases();
    },
    [navigateToAllCases]
  );

  const recentCasesFilterOptions: Partial<FilterOptions> = useMemo(() => {
    if (recentCasesFilterBy === 'myRecentlyAssigned') {
      return getAssigneeFilter({
        isLoadingCurrentUserProfile,
        currentUserProfile,
      });
    }
    return getReporterFilter({
      currentUser,
      isLoadingCurrentUserProfile,
      recentCasesFilterBy,
      currentUserProfile,
    });
  }, [currentUser, currentUserProfile, isLoadingCurrentUserProfile, recentCasesFilterBy]);

  // show the recently reported if we have the current user profile, or if we have the fallback user information
  const hasCurrentUserInfo = currentUserProfile != null || currentUser != null;

  return (
    <>
      <EuiFlexGroup alignItems="center" gutterSize="none" justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <h2>{i18n.RECENT_CASES}</h2>
          </EuiTitle>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <RecentCasesFilters
            filterBy={recentCasesFilterBy}
            setFilterBy={setRecentCasesFilterBy}
            hasCurrentUserInfo={hasCurrentUserInfo}
            isLoading={isLoadingCurrentUserProfile}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiHorizontalRule margin="s" />
      <EuiText color="subdued" size="s">
        <RecentCasesComp
          filterOptions={recentCasesFilterOptions}
          maxCasesToShow={maxCasesToShow}
          recentCasesFilterBy={recentCasesFilterBy}
        />
        <EuiHorizontalRule margin="s" />
        <EuiText size="xs">
          <LinkAnchor onClick={navigateToAllCasesClick} href={getAllCasesUrl()}>
            {' '}
            {i18n.VIEW_ALL_CASES}
          </LinkAnchor>
        </EuiText>
      </EuiText>
    </>
  );
});

RecentCasesWithoutQueryProvider.displayName = 'RecentCases';
