/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo, useContext } from 'react';
import {
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiI18nNumber,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ThemeContext } from 'styled-components';

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
            defaultMessage: 'Total agents',
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

  const theme = useContext(ThemeContext);

  return (
    <EuiFlexGroup gutterSize="l" responsive={false} data-test-subj="policyAgentsSummary">
      {stats.map(({ key, title, health }) => {
        return (
          <EuiFlexItem
            grow={false}
            key={key}
            style={{
              marginRight: key === 'total' ? theme.eui.euiSizeXXL : undefined,
            }}
          >
            <EuiDescriptionList
              textStyle="reverse"
              style={{ textAlign: 'right' }}
              listItems={[
                {
                  title,
                  description: (
                    <>
                      {health && (
                        <EuiHealth
                          color={health === 'warning' ? theme.eui.euiColorWarning : health}
                          className="eui-alignMiddle"
                        />
                      )}
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
