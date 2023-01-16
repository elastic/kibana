/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiPanel,
  EuiStat,
  EuiI18nNumber,
  useEuiTheme,
  EuiText,
  EuiFlexItem,
  EuiLoadingContent,
} from '@elastic/eui';
import { euiStyled } from '@kbn/kibana-react-plugin/common';

import { OverviewStatusState } from '../../../../../../../common/runtime_types';

import * as labels from '../labels';
import { MonitorTestRunsCount } from './monitor_test_runs';
import { MonitorTestRunsSparkline } from './monitor_test_runs_sparkline';

export const MonitorStats = ({ status }: { status: OverviewStatusState | null }) => {
  const { euiTheme } = useEuiTheme();

  return (
    <>
      <EuiFlexGroup gutterSize="l">
        <EuiPanel
          css={{ display: 'flex', flexDirection: 'column', gap: euiTheme.size.l, flexGrow: 0 }}
          hasBorder={true}
          hasShadow={false}
        >
          <EuiText>
            <h5>{labels.SUMMARY_LABEL}</h5>
          </EuiText>

          <EuiFlexItem css={{ display: 'flex', flexDirection: 'row', gap: euiTheme.size.l }}>
            <MonitorStat
              description={labels.CONFIGURATIONS_LABEL}
              value={status?.allMonitorsCount}
            />
            <MonitorStat
              description={labels.DISABLED_LABEL}
              value={status?.disabledMonitorsCount}
            />
          </EuiFlexItem>
        </EuiPanel>

        <EuiPanel
          css={{ display: 'flex', flexDirection: 'column', gap: euiTheme.size.l }}
          hasBorder={true}
          hasShadow={false}
        >
          <EuiText>
            <h5>{labels.getLastXDaysLabel(30)}</h5>
          </EuiText>

          <EuiFlexItem
            css={{ display: 'flex', flexDirection: 'row', gap: euiTheme.size.l, height: '200px' }}
          >
            <MonitorTestRunsCount />
            <EuiFlexItem grow={true}>
              <MonitorTestRunsSparkline />
            </EuiFlexItem>
          </EuiFlexItem>
        </EuiPanel>
      </EuiFlexGroup>
    </>
  );
};

const EuiStatStyled = euiStyled(EuiStat)`
  &&& {
  color: ${({ theme }) => theme.eui.euiTitleColor};
    .euiStat__title {
        color: ${({ theme }) => theme.eui.euiTitleColor};
        font-size: ${({ theme }) => theme.eui.euiFontSizeXL};
    }
  }
`;

const MonitorStat = ({
  description,
  value,
}: {
  description: string | undefined;
  value: number | undefined;
}) => {
  const { euiTheme } = useEuiTheme();
  const statValue = (value as number) ?? undefined;

  return (
    <EuiStatStyled
      description={description}
      title={
        !isNaN(statValue) ? (
          <EuiI18nNumber css={{ fontSize: euiTheme.size.m }} value={statValue} />
        ) : (
          <EuiLoadingContent lines={2} />
        )
      }
      reverse={true}
    />
  );
};
