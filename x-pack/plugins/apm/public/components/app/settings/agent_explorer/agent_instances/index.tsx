/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiHorizontalRule,
  EuiPortal,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useApmParams } from '../../../../../hooks/use_apm_params';
import { FETCH_STATUS } from '../../../../../hooks/use_fetcher';
import { useProgressiveFetcher } from '../../../../../hooks/use_progressive_fetcher';
import { useTimeRange } from '../../../../../hooks/use_time_range';
import { ResponsiveFlyout } from '../../../transaction_details/waterfall_with_summary/waterfall_container/waterfall/responsive_flyout';
import { AgentExplorerItem } from '../agent_list';
import { AgentContextualInformation } from './agent_contextual_information';
import { AgentInstancesDetails } from './agent_instances_details';

function useAgentInstancesFetcher({ serviceName }: { serviceName: string }) {
  const {
    query: { environment, kuery },
  } = useApmParams('/settings/agent-explorer');

  const { start, end } = useTimeRange({ rangeFrom: 'now-24h', rangeTo: 'now' });

  return useProgressiveFetcher(
    (callApmApi) => {
      return callApmApi(
        'GET /internal/apm/services/{serviceName}/agent_instances',
        {
          params: {
            path: {
              serviceName,
            },
            query: {
              environment,
              start,
              end,
              kuery,
            },
          },
        }
      );
    },
    [start, end, serviceName, environment, kuery]
  );
}

interface Props {
  agent: AgentExplorerItem;
  isLatestVersionsLoading: boolean;
  latestVersionsFailed: boolean;
  onClose: () => void;
}

export function AgentInstances({
  agent,
  isLatestVersionsLoading,
  latestVersionsFailed,
  onClose,
}: Props) {
  const { query } = useApmParams('/settings/agent-explorer');

  const instances = useAgentInstancesFetcher({
    serviceName: agent.serviceName,
  });

  const isLoading = instances.status === FETCH_STATUS.LOADING;

  return (
    <EuiPortal>
      <ResponsiveFlyout onClose={onClose} ownFocus={true} maxWidth={false}>
        <EuiFlyoutHeader hasBorder>
          <EuiFlexGroup>
            <EuiFlexItem grow={false}>
              <EuiTitle>
                <h4>
                  {i18n.translate(
                    'xpack.apm.agentExplorer.instancesFlyout.title',
                    {
                      defaultMessage: 'Agent Instances',
                    }
                  )}
                </h4>
              </EuiTitle>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <AgentContextualInformation
            agentName={agent.agentName}
            serviceName={agent.serviceName}
            agentDocsPageUrl={agent.agentDocsPageUrl}
            instances={agent.instances}
            latestVersion={agent.latestVersion}
            query={query}
            isLatestVersionsLoading={isLatestVersionsLoading}
            latestVersionsFailed={latestVersionsFailed}
          />
          <EuiHorizontalRule margin="m" />
          <EuiSpacer size="m" />
          <AgentInstancesDetails
            serviceName={agent.serviceName}
            agentName={agent.agentName}
            agentDocsPageUrl={agent.agentDocsPageUrl}
            isLoading={isLoading}
            items={instances.data?.items ?? []}
          />
        </EuiFlyoutBody>
      </ResponsiveFlyout>
    </EuiPortal>
  );
}
