/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useRef, useCallback } from 'react';
import type { UseQueryResult } from 'react-query';
import { Redirect, Switch, Route, useLocation } from 'react-router-dom';
import { useFindingsEsPit } from './use_findings_es_pit';
import { useLatestFindingsDataView } from '../../common/api/use_latest_findings_data_view';
import { allNavigationItems, findingsNavigation } from '../../common/navigation/constants';
import { CspPageTemplate } from '../../components/csp_page_template';
import { FindingsByResourceContainer } from './latest_findings_by_resource/findings_by_resource_container';
import { LatestFindingsContainer } from './latest_findings/latest_findings_container';

export const Findings = () => {
  const location = useLocation();
  const dataViewQuery = useLatestFindingsDataView();
  // Using a ref for the PIT ID to avoid re-rendering when it changes
  const pitIdRef = useRef<string>();
  const setPitId = useCallback(
    (newPitId: string) => {
      pitIdRef.current = newPitId;
    },
    [pitIdRef]
  );

  const pitQuery = useFindingsEsPit(setPitId);
  // Opening a PIT once and only once by calling `refetch` on mount on the PIT query
  useEffect(() => {
    void pitQuery.refetch();
    return () => {
      pitQuery.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  let queryForPageTemplate: UseQueryResult = dataViewQuery;
  if (pitQuery.isError || pitQuery.isLoading || pitQuery.isIdle) {
    queryForPageTemplate = pitQuery;
  }

  return (
    <CspPageTemplate paddingSize="none" query={queryForPageTemplate}>
      <Switch>
        <Route
          exact
          path={allNavigationItems.findings.path}
          component={() => (
            <Redirect
              to={{
                pathname: findingsNavigation.findings_default.path,
                search: location.search,
              }}
            />
          )}
        />
        <Route
          path={findingsNavigation.findings_default.path}
          render={() => (
            <LatestFindingsContainer
              dataView={dataViewQuery.data!}
              pitIdRef={pitIdRef as React.MutableRefObject<string>}
              setPitId={setPitId}
            />
          )}
        />
        <Route
          path={findingsNavigation.findings_by_resource.path}
          render={() => (
            <FindingsByResourceContainer
              dataView={dataViewQuery.data!}
              pitIdRef={pitIdRef as React.MutableRefObject<string>}
              setPitId={setPitId}
            />
          )}
        />
        <Route
          path={'*'}
          component={() => <Redirect to={findingsNavigation.findings_default.path} />}
        />
      </Switch>
    </CspPageTemplate>
  );
};
