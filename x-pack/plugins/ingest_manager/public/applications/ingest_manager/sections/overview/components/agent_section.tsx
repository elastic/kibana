/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
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
import { Loading } from '../../fleet/components';

export const OverviewAgentSection = () => {
  const { getHref } = useLink();
  const agentStatusRequest = useGetAgentStatus({});

  return (
    <EuiFlexItem component="section">
      <OverviewPanel
        title={i18n.translate('xpack.ingestManager.overviewPageFleetPanelTitle', {
          defaultMessage: 'Fleet',
        })}
        tooltip={i18n.translate('xpack.ingestManager.overviewPageFleetPanelTooltip', {
          defaultMessage:
            'Use Fleet to enroll agents and manage their policies from a central location.',
        })}
        linkTo={getHref('fleet_agent_list')}
        linkToText={i18n.translate('xpack.ingestManager.overviewPageFleetPanelAction', {
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
                  id="xpack.ingestManager.overviewAgentTotalTitle"
                  defaultMessage="Total agents"
                />
              </EuiDescriptionListTitle>
              <EuiDescriptionListDescription>
                <EuiI18nNumber value={agentStatusRequest.data?.results?.total ?? 0} />
              </EuiDescriptionListDescription>
              <EuiDescriptionListTitle>
                <FormattedMessage
                  id="xpack.ingestManager.overviewAgentActiveTitle"
                  defaultMessage="Active"
                />
              </EuiDescriptionListTitle>
              <EuiDescriptionListDescription>
                <EuiI18nNumber value={agentStatusRequest.data?.results?.online ?? 0} />
              </EuiDescriptionListDescription>
              <EuiDescriptionListTitle>
                <FormattedMessage
                  id="xpack.ingestManager.overviewAgentOfflineTitle"
                  defaultMessage="Offline"
                />
              </EuiDescriptionListTitle>
              <EuiDescriptionListDescription>
                <EuiI18nNumber value={agentStatusRequest.data?.results?.offline ?? 0} />
              </EuiDescriptionListDescription>
              <EuiDescriptionListTitle>
                <FormattedMessage
                  id="xpack.ingestManager.overviewAgentErrorTitle"
                  defaultMessage="Error"
                />
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
