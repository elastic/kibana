/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { Routes, Route } from '@kbn/shared-ux-router';
import { findingsNavigation } from '@kbn/cloud-security-posture';
import { useCspSetupStatusApi } from '@kbn/cloud-security-posture/src/hooks/use_csp_setup_status_api';
import { useDataView } from '@kbn/cloud-security-posture/src/hooks/use_data_view';
import { VULNERABILITIES_PAGE } from './test_subjects';
import { CDR_VULNERABILITIES_DATA_VIEW_ID_PREFIX } from '../../../common/constants';
import { NoVulnerabilitiesStates } from '../../components/no_vulnerabilities_states';
import { CloudPosturePage } from '../../components/cloud_posture_page';
import { LatestVulnerabilitiesContainer } from './latest_vulnerabilities_container';
import { DataViewContext } from '../../common/contexts/data_view_context';

export const Vulnerabilities = () => {
  const dataViewQuery = useDataView(CDR_VULNERABILITIES_DATA_VIEW_ID_PREFIX);
  const getSetupStatus = useCspSetupStatusApi();
  const setupStatus = getSetupStatus.data;

  const hasFindings =
    !!setupStatus?.hasVulnerabilitiesFindings || setupStatus?.vuln_mgmt?.status === 'indexed';

  if (!hasFindings) return <NoVulnerabilitiesStates />;

  const dataViewContextValue = {
    dataView: dataViewQuery.data!,
    dataViewRefetch: dataViewQuery.refetch,
    dataViewIsRefetching: dataViewQuery.isRefetching,
  };

  return (
    <CloudPosturePage query={dataViewQuery}>
      <div data-test-subj={VULNERABILITIES_PAGE}>
        <Routes>
          <Route
            path={findingsNavigation.vulnerabilities.path}
            render={() => (
              <DataViewContext.Provider value={dataViewContextValue}>
                <LatestVulnerabilitiesContainer />
              </DataViewContext.Provider>
            )}
          />
        </Routes>
      </div>
    </CloudPosturePage>
  );
};
