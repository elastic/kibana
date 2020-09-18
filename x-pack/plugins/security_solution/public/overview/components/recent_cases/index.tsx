/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiHorizontalRule, EuiText } from '@elastic/eui';
import React, { useEffect, useMemo, useRef, useCallback } from 'react';

import { FilterOptions, QueryParams } from '../../../cases/containers/types';
import { DEFAULT_QUERY_PARAMS, useGetCases } from '../../../cases/containers/use_get_cases';
import { LoadingPlaceholders } from '../loading_placeholders';
import { NoCases } from './no_cases';
import { RecentCases } from './recent_cases';
import * as i18n from './translations';
import { useKibana } from '../../../common/lib/kibana';
import { APP_ID } from '../../../../common/constants';
import { SecurityPageName } from '../../../app/types';
import { useFormatUrl } from '../../../common/components/link_to';
import { LinkAnchor } from '../../../common/components/links';

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
    const { formatUrl } = useFormatUrl(SecurityPageName.case);
    const { navigateToApp } = useKibana().services.application;
    const previousFilterOptions = usePrevious(filterOptions);
    const { data, loading, setFilters } = useGetCases(queryParams);
    const isLoadingCases = useMemo(
      () => loading.indexOf('cases') > -1 || loading.indexOf('caseUpdate') > -1,
      [loading]
    );

    const goToCases = useCallback(
      (ev) => {
        ev.preventDefault();
        navigateToApp(`${APP_ID}:${SecurityPageName.case}`);
      },
      [navigateToApp]
    );

    const allCasesLink = useMemo(
      () => (
        <LinkAnchor onClick={goToCases} href={formatUrl('')}>
          {' '}
          {i18n.VIEW_ALL_CASES}
        </LinkAnchor>
      ),
      [goToCases, formatUrl]
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
