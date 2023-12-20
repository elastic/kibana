/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { Routes, Route } from '@kbn/shared-ux-router';
import { LATEST_VULNERABILITIES_INDEX_PATTERN } from '../../../common/constants';
import { ErrorCallout } from '../configurations/layout/error_callout';
import { NoVulnerabilitiesStates } from '../../components/no_vulnerabilities_states';
import { useCspSetupStatusApi } from '../../common/api/use_setup_status_api';
import { defaultLoadingRenderer, defaultNoDataRenderer } from '../../components/cloud_posture_page';
import { findingsNavigation } from '../../common/navigation/constants';
import { VulnerabilitiesByResource } from './vulnerabilities_by_resource/vulnerabilities_by_resource';
import { ResourceVulnerabilities } from './vulnerabilities_by_resource/resource_vulnerabilities/resource_vulnerabilities';
import { useLatestFindingsDataView } from '../../common/api/use_latest_findings_data_view';
import { LatestVulnerabilitiesContainer } from './latest_vulnerabilities_container';

export const Vulnerabilities = () => {
  const {
    data: dataView,
    isLoading,
    error,
  } = useLatestFindingsDataView(LATEST_VULNERABILITIES_INDEX_PATTERN);

  const getSetupStatus = useCspSetupStatusApi();

  if (getSetupStatus?.data?.vuln_mgmt?.status !== 'indexed') return <NoVulnerabilitiesStates />;

  if (error) {
    return <ErrorCallout error={error as Error} />;
  }
  if (isLoading) {
    return defaultLoadingRenderer();
  }

  if (!dataView) {
    return defaultNoDataRenderer();
  }

  return (
    <Routes>
      <Route
        exact
        path={findingsNavigation.resource_vulnerabilities.path}
        render={() => <ResourceVulnerabilities dataView={dataView} />}
      />
      <Route
        exact
        path={findingsNavigation.vulnerabilities_by_resource.path}
        render={() => <VulnerabilitiesByResource dataView={dataView} />}
      />
      <Route
        path={findingsNavigation.vulnerabilities.path}
        render={() => <LatestVulnerabilitiesContainer dataView={dataView} />}
      />
    </Routes>
  );
};
