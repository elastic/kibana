/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiHorizontalRule, EuiLink, EuiText } from '@elastic/eui';
import React, { useEffect, useMemo, useRef } from 'react';

import { FilterOptions, QueryParams } from '../../containers/case/types';
import { DEFAULT_QUERY_PARAMS, useGetCases } from '../../containers/case/use_get_cases';
import { getCaseUrl } from '../link_to/redirect_to_case';
import { useGetUrlSearch } from '../navigation/use_get_url_search';
import { LoadingPlaceholders } from '../page/overview/loading_placeholders';
import { navTabs } from '../../pages/home/home_navigations';

import { NoCases } from './no_cases';
import { RecentCases } from './recent_cases';
import * as i18n from './translations';

const usePrevious = (value: FilterOptions) => {
  const ref = useRef();
  useEffect(() => {
    (ref.current as unknown) = value;
  });
  return ref.current;
};

const MAX_CASES_TO_SHOW = 3;

const queryParams: QueryParams = {
  ...DEFAULT_QUERY_PARAMS,
  perPage: MAX_CASES_TO_SHOW,
};

const StatefulRecentCasesComponent = React.memo(
  ({ filterOptions }: { filterOptions: FilterOptions }) => {
    const previousFilterOptions = usePrevious(filterOptions);
    const { data, loading, setFilters } = useGetCases(queryParams);
    const isLoadingCases = useMemo(
      () => loading.indexOf('cases') > -1 || loading.indexOf('caseUpdate') > -1,
      [loading]
    );
    const search = useGetUrlSearch(navTabs.case);
    const allCasesLink = useMemo(
      () => <EuiLink href={getCaseUrl(search)}>{i18n.VIEW_ALL_CASES}</EuiLink>,
      [search]
    );

    useEffect(() => {
      if (previousFilterOptions !== undefined && previousFilterOptions !== filterOptions) {
        setFilters(filterOptions);
      }
    }, [previousFilterOptions, filterOptions, setFilters]);

    const content = useMemo(
      () =>
        isLoadingCases ? (
          <LoadingPlaceholders lines={2} placeholders={3} />
        ) : !isLoadingCases && data.cases.length === 0 ? (
          <NoCases />
        ) : (
          <RecentCases cases={data.cases} />
        ),
      [isLoadingCases, data]
    );

    return (
      <EuiText color="subdued" size="s">
        {content}
        <EuiHorizontalRule margin="s" />
        <EuiText size="xs">{allCasesLink}</EuiText>
      </EuiText>
    );
  }
);

StatefulRecentCasesComponent.displayName = 'StatefulRecentCasesComponent';

export const StatefulRecentCases = React.memo(StatefulRecentCasesComponent);
