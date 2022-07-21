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
} from '@elastic/eui';
import { MISSING_FINDINGS_NO_DATA_CONFIG } from '../pages/compliance_dashboard/test_subjects';
import { CloudPosturePage } from './cloud_posture_page';
import { useCspSetupStatusApi } from '../common/api/use_setup_status_api';

const Panel = ({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) => (
  <EuiPanel
    css={css`
      margin-top: 50px;
      margin-left: auto;
      margin-right: auto;
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
          <h2>{'test'}</h2>
        </EuiTitle>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiText color="text" textAlign="center">
          {'test test test test test test test test test test test test test test test test test '}
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  </EuiPanel>
);

const NotDeployed = () => (
  <Panel
    title="No Agents Installed "
    text="text"
    icon={<EuiLoadingLogo logo="logoSecurity" size="xl" />}
  />
);
const IndexTimeout = () => (
  <Panel
    title="Indexing Timeout"
    text="text"
    icon={<EuiLoadingLogo logo="logoSecurity" size="xl" />}
  />
);
const Indexing = () => (
  <Panel
    title="No Findings Yet"
    text="text"
    icon={<EuiLoadingLogo logo="logoSecurity" size="xl" />}
  />
);

/**
 * This component will return the render states based on cloud posture setup status
 * since 'not-installed' is being checked globally by CloudPosturePage and 'indexed' is the pass condition, those states won't be handled here
 * */
export const NoFindingsStates = () => {
  const getSetupStatus = useCspSetupStatusApi();
  const status = getSetupStatus.data?.status;

  const render = () => {
    if (status === 'not-deployed') return <NotDeployed />;
    if (status === 'index-timeout' || true) return <IndexTimeout />;
    if (status === 'indexing') return <Indexing />;
  };

  return <CloudPosturePage query={getSetupStatus}>{render()}</CloudPosturePage>;
};
