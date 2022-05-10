/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { Redirect, Switch, Route, useLocation } from 'react-router-dom';
import { useLatestFindingsDataView } from '../../common/api/use_latest_findings_data_view';
import { allNavigationItems, findingsNavigation } from '../../common/navigation/constants';
import { CspPageTemplate } from '../../components/csp_page_template';
import { FindingsByResourceContainer } from './latest_findings_by_resource/findings_by_resource_container';
import { LatestFindingsContainer } from './latest_findings/latest_findings_container';

export const Findings = () => {
  const location = useLocation();
  const dataViewQuery = useLatestFindingsDataView();

  if (!dataViewQuery.data) return <CspPageTemplate paddingSize="none" query={dataViewQuery} />;

  return (
    <CspPageTemplate paddingSize="none" query={dataViewQuery}>
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
          render={() => <LatestFindingsContainer dataView={dataViewQuery.data} />}
        />
        <Route
          path={findingsNavigation.findings_by_resource.path}
          render={() => <FindingsByResourceContainer dataView={dataViewQuery.data} />}
        />
        <Route
          path={'*'}
          component={() => <Redirect to={findingsNavigation.findings_default.path} />}
        />
      </Switch>
    </CspPageTemplate>
  );
};
