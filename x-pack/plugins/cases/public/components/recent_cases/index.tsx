/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiHorizontalRule, EuiText, EuiTitle } from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';

import * as i18n from './translations';
import { LinkAnchor } from '../links';
import { RecentCasesFilters } from './filters';
import { RecentCasesComp } from './recent_cases';
import { FilterMode as RecentCasesFilterMode } from './types';
import { useCurrentUser } from '../../common/lib/kibana';
import { useAllCasesNavigation } from '../../common/navigation';

export interface RecentCasesProps {
  maxCasesToShow: number;
}

const RecentCases = React.memo(({ maxCasesToShow }: RecentCasesProps) => {
  const currentUser = useCurrentUser();
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

  const recentCasesFilterOptions = useMemo(
    () =>
      recentCasesFilterBy === 'myRecentlyReported' && currentUser != null
        ? {
            reporters: [
              {
                email: currentUser.email,
                full_name: currentUser.fullName,
                username: currentUser.username,
              },
            ],
          }
        : { reporters: [] },
    [currentUser, recentCasesFilterBy]
  );

  return (
    <>
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
              showMyRecentlyReported={currentUser != null}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiHorizontalRule margin="s" />
      </>
      <EuiText color="subdued" size="s">
        <RecentCasesComp filterOptions={recentCasesFilterOptions} maxCasesToShow={maxCasesToShow} />
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

RecentCases.displayName = 'RecentCases';

// eslint-disable-next-line import/no-default-export
export { RecentCases as default };
