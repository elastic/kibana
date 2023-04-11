/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';

import { LATEST_VULNERABILITIES_INDEX_DEFAULT_NS } from '../../../common/constants';
import { useLatestFindingsDataView } from '../../common/api/use_latest_findings_data_view';
import { useCspSetupStatusApi } from '../../common/api/use_setup_status_api';
import { CloudPosturePage } from '../../components/cloud_posture_page';
import { NoVulnerabilitiesStates } from '../../components/no_vulnerabilities_states';
import { VULNERABILITIES_CONTAINER_TEST_SUBJ } from '../../components/test_subjects';

export const Vulnerabilities = () => {
  const dataViewQuery = useLatestFindingsDataView(LATEST_VULNERABILITIES_INDEX_DEFAULT_NS);
  const getSetupStatus = useCspSetupStatusApi();

  if (getSetupStatus?.data?.vuln_mgmt.status !== 'indexed') return <NoVulnerabilitiesStates />;

  return (
    <CloudPosturePage query={dataViewQuery}>
      {/**  Add child routes and latest findings by resource */}
      <div data-test-subj={VULNERABILITIES_CONTAINER_TEST_SUBJ}>
        <h1> Vulnerabilities </h1>
      </div>
    </CloudPosturePage>
  );
};
