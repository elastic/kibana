/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { Redirect, Switch, Route, useLocation } from 'react-router-dom';
import { TrackApplicationView } from '@kbn/usage-collection-plugin/public';
import { useCspSetupStatusApi } from '../../common/api/use_setup_status_api';
import { NoFindingsStates } from '../../components/no_findings_states';
import { CloudPosturePage } from '../../components/cloud_posture_page';
import { useLatestFindingsDataView } from '../../common/api/use_latest_findings_data_view';
import { cloudPosturePages, findingsNavigation } from '../../common/navigation/constants';
import { FindingsByResourceContainer } from './latest_findings_by_resource/findings_by_resource_container';
import { LatestFindingsContainer } from './latest_findings/latest_findings_container';

export const Findings = () => {
  const location = useLocation();
  const dataViewQuery = useLatestFindingsDataView();
  const getSetupStatus = useCspSetupStatusApi();

  const hasFindings = getSetupStatus.data?.status === 'indexed';
  if (!hasFindings) return <NoFindingsStates />;

  return (
    <CloudPosturePage query={dataViewQuery}>
      <Switch>
        <Route
          exact
          path={cloudPosturePages.findings.path}
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
            <TrackApplicationView viewId={findingsNavigation.findings_default.id}>
              <LatestFindingsContainer dataView={dataViewQuery.data!} />
            </TrackApplicationView>
          )}
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
    </CloudPosturePage>
  );
};
