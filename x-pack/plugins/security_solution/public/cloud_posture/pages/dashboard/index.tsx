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
  EuiButtonEmpty,
  EuiFlexItem,
  EuiStat,
  EuiPanel,
  EuiCard,
  EuiSpacer,
  EuiFlexGroup,
  PropsOf,
} from '@elastic/eui';
import styled from 'styled-components';
import { SecuritySolutionPageWrapper } from '../../../common/components/page_wrapper';
import { HeaderPage } from '../../../common/components/header_page';
import { ChartList } from './chart_list';
import { CloudPostureScoreChart } from './cloud_posture_score_chart';
import { TopResourceRiskList } from './top_resource_risk_list';
import { ScorePerAccountAndCluster } from './score_per_account_and_cluster';

const Desc = (
  <EuiText size="s">
    <EuiTextColor color="subdued">Non compliant first</EuiTextColor>
  </EuiText>
);

const cards = [
  {
    title: (
      <EuiFlexGroup alignItems="center" style={{ marginBottom: 8 }}>
        <EuiFlexItem grow={true}>
          <EuiTitle size="s">
            <span>Cloud Posture Score</span>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false} style={{ marginRight: 0 }}>
          <EuiButtonEmpty size="xs" href="#href" aria-label="Go to Dashboards">
            View Rules
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
    children: CloudPostureScoreChart,
  },
  { title: 'Top 5 Resource Types at Risk', description: Desc, children: TopResourceRiskList },
  { title: 'Score Per Account / Cluster', description: Desc, children: ScorePerAccountAndCluster },
];

export const Dashboard = () => {
  return (
    <SecuritySolutionPageWrapper noPadding={false} data-test-subj="csp_rules">
      <HeaderPage hideSourcerer border title={'Dashboard'} />
      <DashboardWrapper>
        <TopContent>
          {cards.map(({ children: Comp, ...rest }, i) => (
            <Card key={i} {...rest}>
              <Comp />
            </Card>
          ))}
        </TopContent>
        <MiddleContent>
          <Card title="Compliance Trend"> </Card>
          <Card title="Findings Trend"> </Card>
        </MiddleContent>
        <BottomContent>
          <div style={{ gridColumn: '1/-1' }}>foo 4</div>
        </BottomContent>
      </DashboardWrapper>
      <EuiSpacer />
    </SecuritySolutionPageWrapper>
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
  grid-template-rows: 300px 300px 1fr;
  grid-gap: 30px;
`;

const TopContent = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  grid-gap: 30px;
`;
const MiddleContent = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-gap: 30px;
`;

const BottomContent = styled.div`
  display: grid;
  grid-auto-flow: row;
  grid-auto-rows: 150px;
  grid-gap: 30px;
`;
