/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import {
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiI18nNumber,
} from '@elastic/eui';
import { Chart, Partition, Settings } from '@elastic/charts';
import { i18n } from '@kbn/i18n';

export interface AgentsSummaryProps {
  total: number;
  online: number;
  offline: number;
  error: number;
}

/**
 * Display a summary of stats (counts) associated with a group of agents (ex. those associated with a Policy)
 */
export const AgentsSummary = memo<AgentsSummaryProps>((props) => {
  const stats = useMemo<
    Array<{ key: keyof AgentsSummaryProps; title: string; health: string }>
  >(() => {
    return [
      {
        key: 'total',
        title: i18n.translate(
          'xpack.securitySolution.endpoint.policyDetails.agentsSummary.totalTitle',
          {
            defaultMessage: 'Agents',
          }
        ),
        health: '',
      },
      {
        key: 'online',
        title: i18n.translate(
          'xpack.securitySolution.endpoint.policyDetails.agentsSummary.onlineTitle',
          {
            defaultMessage: 'Healthy',
          }
        ),
        health: 'success',
      },
      {
        key: 'error',
        title: i18n.translate(
          'xpack.securitySolution.endpoint.policyDetails.agentsSummary.errorTitle',
          {
            defaultMessage: 'Unhealthy',
          }
        ),
        health: 'warning',
      },
      {
        key: 'offline',
        title: i18n.translate(
          'xpack.securitySolution.endpoint.policyDetails.agentsSummary.offlineTitle',
          {
            defaultMessage: 'Offline',
          }
        ),
        health: 'subdued',
      },
    ];
  }, []);

  /* const donut = useMemo(() => {
    return (
      <Chart size={{ height: 50 }}>
        <Settings ariaLabelledBy={exampleTwo} />
        <Partition
          id="donutByTotalAgents"
          data={[
            {
              status: 'Healthy',
              percent: props.online / props.total,
            },
            {
              status: 'Unhealthy',
              percent: props.error / props.total,
            },
            {
              status: 'Offline',
              percent: props.offline / props.total,
            },
          ]}
          valueAccessor={(d) => Number(d.percent)}
          valueFormatter={() => ''}
          layers={[
            {
              groupByRollup: (d) => d.status,
              shape: {
                fillColor: (d) => euiChartTheme.theme.colors.vizColors[d.sortIndex],
              },
            },
          ]}
          config={{
            ...euiPartitionConfig,
            emptySizeRatio: 0.4,
            clockwiseSectors: false,
          }}
        />
      </Chart>
    );
  }, [props.error, props.online, props.offline, props.total]);
   */

  return (
    <EuiFlexGroup gutterSize="xl" responsive={false} data-test-subj="policyAgentsSummary">
      {stats.map(({ key, title, health }) => {
        return (
          <EuiFlexItem grow={false} key={key}>
            <EuiDescriptionList
              textStyle="reverse"
              align="center"
              listItems={[
                {
                  title,
                  description: (
                    <>
                      {health && <EuiHealth color={health} className="eui-alignMiddle" />}
                      <EuiI18nNumber value={props[key]} />
                    </>
                  ),
                },
              ]}
            />
          </EuiFlexItem>
        );
      })}
    </EuiFlexGroup>
  );
});

AgentsSummary.displayName = 'AgentsSummary';
