/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import {
  EuiPanel,
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiLoadingLogo,
  EuiButton,
  EuiEmptyPrompt,
} from '@elastic/eui';
import { MISSING_FINDINGS_NO_DATA_CONFIG } from '../pages/compliance_dashboard/test_subjects';
import { CloudPosturePage } from './cloud_posture_page';
import { useCspSetupStatusApi } from '../common/api/use_setup_status_api';

const Panel = ({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) => (
  <EuiPanel
    css={css`
      margin: 50px auto;
      max-width: 450px;
      // TODO: get size from eui
      padding: 26px 52px;
    `}
    // TODO: fix test
    data-test-subj={MISSING_FINDINGS_NO_DATA_CONFIG}
  >
    <EuiFlexGroup direction="column" alignItems="center">
      <EuiFlexItem>{icon}</EuiFlexItem>
      <EuiFlexItem>
        <EuiTitle>
          <h2>{title}</h2>
        </EuiTitle>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiText color="text" textAlign="center">
          {text}
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  </EuiPanel>
);

const Panel2 = () => (
  <EuiEmptyPrompt
    color="plain"
    iconType="dashboardApp"
    iconColor="default"
    title={<h2>Dashboards</h2>}
    body={<p>You don&apos;t have any dashboards yet.</p>}
    actions={[
      <EuiButton fill iconType="plusInCircleFilled">
        Create new dashboard
      </EuiButton>,
    ]}
  />
);

const NotDeployed = () => (
  <EuiEmptyPrompt
    data-test-subj="no-agent-deployed"
    color="plain"
    title={<h2>{'No Agents Installed'}</h2>}
    body={<p>{'To see findings, install an elastic agent</b> on your cluster'}</p>}
    iconType="fleetApp"
  />
);

const Indexing = () => (
  <EuiEmptyPrompt
    color="plain"
    title={<h2>{'No Findings Yet'}</h2>}
    body={
      <p>
        {'Waiting for data to be collected and indexed.</b> Check back later to see your findings'}
      </p>
    }
    icon={<EuiLoadingLogo logo="logoSecurity" size="xl" />}
  />
);

const IndexTimeout = () => (
  <EuiEmptyPrompt
    color="plain"
    title={<h2>{'Findings Delayed'}</h2>}
    body={<p>{'Collecting findings is taking longer than expected,</b> check back again soon'}</p>}
    icon={<EuiLoadingLogo logo="logoSecurity" size="xl" />}
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
    if (status === 'not-deployed') return <NotDeployed />;
    if (status === 'indexing') return <Indexing />;
    if (status === 'index-timeout' || true) return <IndexTimeout />;
  };

  return (
    <CloudPosturePage query={getSetupStatus}>
      <div style={{ margin: '50px auto' }}>{render()}</div>
    </CloudPosturePage>
  );
};
