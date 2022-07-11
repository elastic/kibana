/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import type { UseQueryResult } from 'react-query';
import { Redirect, Switch, Route, useLocation } from 'react-router-dom';
import { SetupStatus } from '../../components/setup_status';
import { useFindingsEsPit } from './es_pit/use_findings_es_pit';
import { FindingsEsPitContext } from './es_pit/findings_es_pit_context';
import { useLatestFindingsDataView } from '../../common/api/use_latest_findings_data_view';
import { allNavigationItems, findingsNavigation } from '../../common/navigation/constants';
import { CspPageTemplate } from '../../components/csp_page_template';
import { FindingsByResourceContainer } from './latest_findings_by_resource/findings_by_resource_container';
import { LatestFindingsContainer } from './latest_findings/latest_findings_container';

export const Findings = () => {
  const location = useLocation();
  const dataViewQuery = useLatestFindingsDataView();
  // TODO: Consider splitting the PIT window so that each "group by" view has its own PIT
  const { pitQuery, pitIdRef, setPitId } = useFindingsEsPit('findings');

  let queryForSetupStatus: UseQueryResult = dataViewQuery;
  if (pitQuery.isError || pitQuery.isLoading || pitQuery.isIdle) {
    queryForSetupStatus = pitQuery;
  }

  return (
    <CspPageTemplate paddingSize="none">
      <SetupStatus query={queryForSetupStatus}>
        <FindingsEsPitContext.Provider
          value={{
            pitQuery,
            // Asserting the ref as a string value since at this point the query was necessarily successful
            pitIdRef: pitIdRef as React.MutableRefObject<string>,
            setPitId,
          }}
        >
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
              render={() => <LatestFindingsContainer dataView={dataViewQuery.data!} />}
            />
            <Route
              path={findingsNavigation.findings_by_resource.path}
              render={() => <FindingsByResourceContainer dataView={dataViewQuery.data!} />}
            />
            <Route
              path={'*'}
              component={() => <Redirect to={findingsNavigation.findings_default.path} />}
            />
          </Switch>
        </FindingsEsPitContext.Provider>
      </SetupStatus>
    </CspPageTemplate>
  );
};
