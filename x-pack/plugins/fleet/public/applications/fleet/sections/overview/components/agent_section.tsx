/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import {
  EuiI18nNumber,
  EuiDescriptionListTitle,
  EuiDescriptionListDescription,
  EuiFlexItem,
} from '@elastic/eui';
import { OverviewPanel } from './overview_panel';
import { OverviewStats } from './overview_stats';
import { useLink, useGetAgentStatus } from '../../../hooks';
import { Loading } from '../../agents/components';

export const OverviewAgentSection = () => {
  const { getHref } = useLink();
  const agentStatusRequest = useGetAgentStatus({});

  return (
    <EuiFlexItem component="section" data-test-subj="fleet-agent-section">
      <OverviewPanel
        title={i18n.translate('xpack.fleet.overviewPageAgentsPanelTitle', {
          defaultMessage: 'Agents',
        })}
        tooltip={i18n.translate('xpack.fleet.overviewPageFleetPanelTooltip', {
          defaultMessage:
            'Use Fleet to enroll agents and manage their policies from a central location.',
        })}
        linkTo={getHref('fleet_agent_list')}
        linkToText={i18n.translate('xpack.fleet.overviewPageFleetPanelAction', {
          defaultMessage: 'View agents',
        })}
      >
        <OverviewStats>
          {agentStatusRequest.isLoading ? (
            <Loading />
          ) : (
            <>
              <EuiDescriptionListTitle>
                <FormattedMessage
                  id="xpack.fleet.overviewAgentTotalTitle"
                  defaultMessage="Total agents"
                />
              </EuiDescriptionListTitle>
              <EuiDescriptionListDescription>
                <EuiI18nNumber value={agentStatusRequest.data?.results?.total ?? 0} />
              </EuiDescriptionListDescription>
              <EuiDescriptionListTitle>
                <FormattedMessage
                  id="xpack.fleet.overviewAgentActiveTitle"
                  defaultMessage="Active"
                />
              </EuiDescriptionListTitle>
              <EuiDescriptionListDescription>
                <EuiI18nNumber value={agentStatusRequest.data?.results?.online ?? 0} />
              </EuiDescriptionListDescription>
              <EuiDescriptionListTitle>
                <FormattedMessage
                  id="xpack.fleet.overviewAgentOfflineTitle"
                  defaultMessage="Offline"
                />
              </EuiDescriptionListTitle>
              <EuiDescriptionListDescription>
                <EuiI18nNumber value={agentStatusRequest.data?.results?.offline ?? 0} />
              </EuiDescriptionListDescription>
              <EuiDescriptionListTitle>
                <FormattedMessage id="xpack.fleet.overviewAgentErrorTitle" defaultMessage="Error" />
              </EuiDescriptionListTitle>
              <EuiDescriptionListDescription>
                <EuiI18nNumber value={agentStatusRequest.data?.results?.error ?? 0} />
              </EuiDescriptionListDescription>
            </>
          )}
        </OverviewStats>
      </OverviewPanel>
    </EuiFlexItem>
  );
};
