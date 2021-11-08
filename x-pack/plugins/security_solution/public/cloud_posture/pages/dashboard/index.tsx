/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable no-console */
/* eslint-disable react/button-has-type */
/* eslint-disable react/jsx-no-literals */

import React from 'react';
import {
  EuiTextColor,
  EuiText,
  EuiTitle,
  EuiListGroup,
  EuiButtonEmpty,
  EuiFlexItem,
  EuiCard,
  EuiProgress,
  EuiSpacer,
  EuiFlexGroup,
} from '@elastic/eui';
import styled from 'styled-components';
import { SecuritySolutionPageWrapper } from '../../../common/components/page_wrapper';
import { HeaderPage } from '../../../common/components/header_page';
import { CloudPostureScoreChart } from './cloud_posture_score_chart';
import { SpyRoute } from '../../../common/utils/route/spy_routes';
import { CloudPosturePage } from '../../../app/types';
import { useCloudPostureFindingsApi } from '../../common/api';

export const Dashboard = () => {
  return (
    <SecuritySolutionPageWrapper noPadding={false} data-test-subj="csp_rules">
      <HeaderPage hideSourcerer border title={'Dashboard'} />
      <DashboardWrapper>
        <TopContent>
          <ScoreCard />
          <ResourcesCard />
        </TopContent>
      </DashboardWrapper>
      <EuiSpacer />
      <SpyRoute pageName={CloudPosturePage.dashboard} />
    </SecuritySolutionPageWrapper>
  );
};

const ResourcesCard = () => {
  const findings = useCloudPostureFindingsApi();

  // TODO: handle states: isSuccess/isError/isLoading
  if (!findings.isSuccess) return <h1>???</h1>;

  const d = [...new Set(findings.data.map((v) => v._source['Resource']))];

  return (
    <Card title="Resources">
      <EuiListGroup
        listItems={d.map((v) => ({
          label: v,
          href: '#',
        }))}
      />
    </Card>
  );
};
const ScoreCard = () => {
  const findings = useCloudPostureFindingsApi();

  // TODO: handle states: isSuccess/isError/isLoading
  if (!findings.isSuccess) return <h1>???</h1>;

  const d = findings.data.map((v) => ({ ...v, ...v._source }));

  console.log({ d });
  const passed = d.filter((v) => v.Evaluation === 'pass');
  const failed = d.filter((v) => v.Evaluation === 'Fail');

  const data = [
    { label: 'Passed', value: (passed.length / d.length) * 100, color: 'success' },
    {
      label: 'Failed',
      value: (failed.length / d.length) * 100,
      color: 'danger',
    },
  ];
  return (
    <Card title="Rules">
      <EuiSpacer size="l" />
      {data.map((item) => (
        <React.Fragment key={item.value}>
          <EuiProgress valueText={true} max={100} size="l" {...item} />
          <EuiSpacer size="l" />
        </React.Fragment>
      ))}
    </Card>
  );
};

const Card = styled(EuiCard).attrs((p) => ({ ...p, textAlign: 'left', hasBorder: true }))`
  display: flex;
  flex-flow: column;

  .euiCard__content {
    display: flex;
    flex-flow: column;
    flex: 1;
  }
  .euiCard__children {
    flex: 1;
    display: flex;
    flex-flow: column;
    justify-content: center;
  }
`;

const DashboardWrapper = styled.div`
  display: grid;
  height: 100%;
  flex: 1;
  grid-template-rows: max-content 1fr;
  grid-gap: 30px;
`;

const TopContent = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  grid-gap: 30px;
`;
