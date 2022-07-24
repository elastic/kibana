/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLoadingLogo, EuiButton, EuiEmptyPrompt } from '@elastic/eui';
import { useCISIntegrationPoliciesLink } from '../common/navigation/use_navigate_to_cis_integration_policies';
import { NO_FINDINGS_STATUS_TEST_SUBJ } from './test_subjects';
import { CloudPosturePage } from './cloud_posture_page';
import { useCspSetupStatusApi } from '../common/api/use_setup_status_api';

const NotDeployed = () => {
  const integrationLink = useCISIntegrationPoliciesLink();

  return (
    <EuiEmptyPrompt
      data-test-subj={NO_FINDINGS_STATUS_TEST_SUBJ.NO_AGENTS_DEPLOYED}
      color="plain"
      iconType="fleetApp"
      title={<h2>{'No Agents Installed'}</h2>}
      body={<p>To see findings, install an elastic agent on your cluster</p>}
      actions={[
        <EuiButton fill href={integrationLink} isDisabled={!integrationLink}>
          Install Agent
        </EuiButton>,
      ]}
    />
  );
};

const Indexing = () => (
  <EuiEmptyPrompt
    data-test-subj={NO_FINDINGS_STATUS_TEST_SUBJ.INDEXING}
    color="plain"
    icon={<EuiLoadingLogo logo="logoSecurity" size="xl" />}
    title={<h2>{'No Findings Yet'}</h2>}
    body={
      <p>Waiting for data to be collected and indexed. Check back later to see your findings</p>
    }
  />
);

const IndexTimeout = () => (
  <EuiEmptyPrompt
    data-test-subj={NO_FINDINGS_STATUS_TEST_SUBJ.INDEX_TIMEOUT}
    color="plain"
    icon={<EuiLoadingLogo logo="logoSecurity" size="xl" />}
    title={<h2>{'Findings Delayed'}</h2>}
    body={<p>Collecting findings is taking longer than expected, check back again soon</p>}
  />
);

/**
 * This component will return the render states based on cloud posture setup status API
 * since 'not-installed' is being checked globally by CloudPosturePage and 'indexed' is the pass condition, those states won't be handled here
 * */
export const NoFindingsStates = () => {
  const getSetupStatus = useCspSetupStatusApi();
  const status = getSetupStatus.data?.status;

  const render = () => {
    if (status === 'not-deployed' || true) return <NotDeployed />;
    if (status === 'indexing') return <Indexing />;
    if (status === 'index-timeout') return <IndexTimeout />;
  };

  return (
    <CloudPosturePage query={getSetupStatus}>
      <div style={{ margin: '50px auto' }}>{render()}</div>
    </CloudPosturePage>
  );
};
