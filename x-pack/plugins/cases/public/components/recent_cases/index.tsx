/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiHorizontalRule, EuiText, EuiTitle } from '@elastic/eui';
import React, { useMemo, useState } from 'react';

import * as i18n from './translations';
import { CaseDetailsHrefSchema, CasesNavigation, LinkAnchor } from '../links';
import { RecentCasesFilters } from './filters';
import { RecentCasesComp } from './recent_cases';
import { FilterMode as RecentCasesFilterMode } from './types';
import { useCurrentUser } from '../../common/lib/kibana';

export interface RecentCasesProps {
  allCasesNavigation: CasesNavigation;
  caseDetailsNavigation: CasesNavigation<CaseDetailsHrefSchema, 'configurable'>;
  createCaseNavigation: CasesNavigation;
  maxCasesToShow: number;
}

const RecentCases = ({
  allCasesNavigation,
  caseDetailsNavigation,
  createCaseNavigation,
  maxCasesToShow,
}: RecentCasesProps) => {
  const currentUser = useCurrentUser();
  const [recentCasesFilterBy, setRecentCasesFilterBy] = useState<RecentCasesFilterMode>(
    'recentlyCreated'
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
        : {},
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
        <RecentCasesComp
          caseDetailsNavigation={caseDetailsNavigation}
          createCaseNavigation={createCaseNavigation}
          filterOptions={recentCasesFilterOptions}
          maxCasesToShow={maxCasesToShow}
        />
        <EuiHorizontalRule margin="s" />
        <EuiText size="xs">
          <LinkAnchor onClick={allCasesNavigation.onClick} href={allCasesNavigation.href}>
            {' '}
            {i18n.VIEW_ALL_CASES}
          </LinkAnchor>
        </EuiText>
      </EuiText>
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export { RecentCases as default };
