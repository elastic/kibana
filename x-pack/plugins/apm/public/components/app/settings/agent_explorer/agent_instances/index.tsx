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
import { TypeOf } from '@kbn/typed-react-router-config';
import React from 'react';
import { AgentExplorerFieldName } from '../../../../../../common/agent_explorer';
import { NOT_AVAILABLE_LABEL } from '../../../../../../common/i18n';
import { AgentName } from '../../../../../../typings/es_schemas/ui/fields/agent';
import { useApmParams } from '../../../../../hooks/use_apm_params';
import { FETCH_STATUS } from '../../../../../hooks/use_fetcher';
import { useProgressiveFetcher } from '../../../../../hooks/use_progressive_fetcher';
import { useTimeRange } from '../../../../../hooks/use_time_range';
import { ApmRoutes } from '../../../../routing/apm_route_config';
import { ServiceLink } from '../../../../shared/service_link';
import { StickyProperties } from '../../../../shared/sticky_properties';
import { TruncateWithTooltip } from '../../../../shared/truncate_with_tooltip';
import { AgentExplorerDocsLink } from '../agent_explorer_docs_link';
import { ResponsiveFlyout } from '../../../transaction_details/waterfall_with_summary/waterfall_container/waterfall/responsive_flyout';
import { AgentExplorerItem } from '../agent_list';
import { AgentInstancesDetails } from './agent_instances_details';

function useAgentInstancesFetcher({ serviceName }: { serviceName?: string }) {
  const {
    query: { environment, rangeFrom, rangeTo, kuery },
  } = useApmParams('/settings/agent-explorer');

  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  return useProgressiveFetcher(
    (callApmApi) => {
      if (!serviceName) {
        return;
      }

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

function formatString(value?: string | null) {
  return value || NOT_AVAILABLE_LABEL;
}

export function AgentContextualInformation({
  agentName,
  serviceName,
  agentRepoUrl,
  instances,
  query,
}: {
  agentName?: AgentName;
  serviceName?: string;
  agentRepoUrl?: string;
  instances?: number;
  query: TypeOf<ApmRoutes, '/settings/agent-explorer'>['query'];
}) {
  const stickyProperties = [
    {
      label: i18n.translate('xpack.apm.agentInstancesDetails.serviceLabel', {
        defaultMessage: 'Service',
      }),
      fieldName: AgentExplorerFieldName.ServiceName,
      val: (
        <TruncateWithTooltip
          data-test-subj="apmAgentExplorerListServiceLink"
          text={formatString(serviceName)}
          content={
            <ServiceLink
              agentName={agentName}
              query={{
                kuery: query.kuery,
                serviceGroup: '',
                rangeFrom: query.rangeFrom,
                rangeTo: query.rangeTo,
                environment: query.environment,
                comparisonEnabled: true,
              }}
              serviceName={serviceName ?? ''}
            />
          }
        />
      ),
      width: '25%',
    },
    {
      label: i18n.translate('xpack.apm.agentInstancesDetails.agentNameLabel', {
        defaultMessage: 'Agent Name',
      }),
      fieldName: AgentExplorerFieldName.AgentName,
      val: (
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem className="eui-textTruncate">
            <span className="eui-textTruncate">{agentName}</span>
          </EuiFlexItem>
        </EuiFlexGroup>
      ),
      width: '25%',
    },
    {
      label: i18n.translate('xpack.apm.agentInstancesDetails.intancesLabel', {
        defaultMessage: 'Instances',
      }),
      fieldName: 'instances',
      val: (
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem className="eui-textTruncate">
            <span className="eui-textTruncate">{instances}</span>
          </EuiFlexItem>
        </EuiFlexGroup>
      ),
      width: '25%',
    },
    {
      label: i18n.translate(
        'xpack.apm.agentInstancesDetails.agentDocsUrlLabel',
        {
          defaultMessage: 'Agent documentation',
        }
      ),
      fieldName: AgentExplorerFieldName.AgentRepoUrl,
      val: (
        <TruncateWithTooltip
          data-test-subj="apmAgentExplorerListDocsLink"
          text={formatString(`${agentName} agent docs`)}
          content={
            <AgentExplorerDocsLink
              agentName={agentName as AgentName}
              repositoryUrl={agentRepoUrl}
            />
          }
        />
      ),
      width: '25%',
    },
  ];

  return <StickyProperties stickyProperties={stickyProperties} />;
}

interface Props {
  agent?: AgentExplorerItem;
  onClose: () => void;
}

export function AgentInstances({ agent, onClose }: Props) {
  const { query } = useApmParams('/settings/agent-explorer');

  const instances = useAgentInstancesFetcher({
    serviceName: agent?.serviceName,
  });

  if (!instances) {
    return null;
  }

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
            agentName={agent?.agentName}
            serviceName={agent?.serviceName}
            agentRepoUrl={agent?.agentRepoUrl}
            instances={agent?.instances}
            query={query}
          />
          <EuiHorizontalRule margin="m" />
          <EuiSpacer size="m" />
          <AgentInstancesDetails
            serviceName={agent?.serviceName}
            isLoading={isLoading}
            items={instances.data?.items ?? []}
          />
        </EuiFlyoutBody>
      </ResponsiveFlyout>
    </EuiPortal>
  );
}
