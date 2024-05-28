/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { Redirect, useLocation } from 'react-router-dom';
import { Routes, Route } from '@kbn/shared-ux-router';
import { TrackApplicationView } from '@kbn/usage-collection-plugin/public';
import { LATEST_FINDINGS_INDEX_PATTERN } from '../../../common/constants';
import { useCspSetupStatusApi } from '../../common/api/use_setup_status_api';
import { NoFindingsStates } from '../../components/no_findings_states';
import { CloudPosturePage } from '../../components/cloud_posture_page';
import { useDataView } from '../../common/api/use_data_view';
import { cloudPosturePages, findingsNavigation } from '../../common/navigation/constants';
import { LatestFindingsContainer } from './latest_findings/latest_findings_container';
import { DataViewContext } from '../../common/contexts/data_view_context';

export const Configurations = () => {
  const location = useLocation();
  const dataViewQuery = useDataView(LATEST_FINDINGS_INDEX_PATTERN);
  const { data: getSetupStatus } = useCspSetupStatusApi();
  const hasConfigurationFindings =
    getSetupStatus?.kspm.status === 'indexed' || getSetupStatus?.cspm.status === 'indexed';

  // For now, when there are no findings we prompt first to install cspm, if it is already installed we will prompt to
  // install kspm
  const noFindingsForPostureType =
    getSetupStatus?.cspm.status !== 'not-installed' ? 'cspm' : 'kspm';

  if (!hasConfigurationFindings) return <NoFindingsStates postureType={noFindingsForPostureType} />;

  const dataViewContextValue = {
    dataView: dataViewQuery.data!,
    dataViewRefetch: dataViewQuery.refetch,
    dataViewIsRefetching: dataViewQuery.isRefetching,
  };

  return (
    <CloudPosturePage query={dataViewQuery}>
      <Routes>
        <Route
          exact
          path={cloudPosturePages.findings.path}
          render={() => (
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
              <DataViewContext.Provider value={dataViewContextValue}>
                <LatestFindingsContainer />
              </DataViewContext.Provider>
            </TrackApplicationView>
          )}
        />
        <Route path="*" render={() => <Redirect to={findingsNavigation.findings_default.path} />} />
      </Routes>
    </CloudPosturePage>
  );
};
