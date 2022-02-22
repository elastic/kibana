/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useParams } from 'react-router-dom';

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import styled from 'styled-components';

import { InputsModelId } from '../../../common/store/inputs/constants';
import { KpiUniqueIps } from '../common/kpi_unique_ips';
import { KpiUserAuthentications } from '../common/kpi_user_authentications';
import { KpiHosts } from '../common/kpi_hosts';

const panelHeight = 280;
const panelMinWidth = 264;
const StyledEuiFlexGroup = styled(EuiFlexGroup)`
  flex-wrap: 'wrap';
`;

const StyledEuiFlexItem = styled(EuiFlexItem)`
  height: ${panelHeight}px;
  minwidth: ${({ grow = 1 }: { grow: number }) => panelMinWidth * grow}px;
`;

interface Props {
  from: string;
  to: string;
  showKpiHost?: boolean;
}

export const ExploratoryChartsComponents = ({ from, to, showKpiHost = true }: Props) => {
  return (
    <StyledEuiFlexGroup>
      {showKpiHost && (
        <StyledEuiFlexItem grow={1}>
          <KpiHosts from={from} to={to} />
        </StyledEuiFlexItem>
      )}
      <StyledEuiFlexItem grow={2}>
        <KpiUserAuthentications from={from} to={to} />
      </StyledEuiFlexItem>
      <StyledEuiFlexItem grow={2}>
        <KpiUniqueIps from={from} to={to} />
      </StyledEuiFlexItem>
    </StyledEuiFlexGroup>
  );
};

export const ExploratoryCharts = React.memo(ExploratoryChartsComponents);

ExploratoryCharts.displayName = 'ExploratoryCharts';
