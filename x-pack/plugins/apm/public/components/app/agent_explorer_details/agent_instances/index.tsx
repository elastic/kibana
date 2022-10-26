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
  EuiHorizontalRule, EuiLoadingSpinner, EuiPortal,
  EuiSpacer,
  EuiTitle
} from '@elastic/eui';
import { AgentExplorerFieldName } from '@kbn/apm-plugin/common/agent_explorer';
import { AgentName } from '@kbn/apm-plugin/typings/es_schemas/ui/fields/agent';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { NOT_AVAILABLE_LABEL } from '../../../../../common/i18n';
import { useApmParams } from '../../../../hooks/use_apm_params';
import { FETCH_STATUS } from '../../../../hooks/use_fetcher';
import { useProgressiveFetcher } from '../../../../hooks/use_progressive_fetcher';
import { useTimeRange } from '../../../../hooks/use_time_range';
import { AgentIcon } from '../../../shared/agent_icon';
import { StickyProperties } from '../../../shared/sticky_properties';
import { TruncateWithTooltip } from '../../../shared/truncate_with_tooltip';
import { AgentExplorerDocsLink } from '../../agent_explorer_docs_link';
import { ResponsiveFlyout } from '../../transaction_details/waterfall_with_summary/waterfall_container/waterfall/responsive_flyout';
import { AgentExplorerItem } from '../agent_list';
import { AgentInstancesDetails } from './agent_instances_details';

function useAgentInstancesFetcher({
  serviceName,
}: {
  serviceName: string;
}) {

  const {
    query: { environment, rangeFrom, rangeTo, kuery },
  } = useApmParams('/agent-explorer');

  const { start, end } = useTimeRange({ rangeFrom, rangeTo});

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
              environment: environment,
              start,
              end,
              kuery: kuery,
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

export function AgentContextualInformation(
  {
    agentName,
    serviceName,
    agentRepoUrl,
    isLoading,
    instances,
  }: {
    agentName?: AgentName;
    serviceName: string;
    agentRepoUrl?: string;
    isLoading: boolean;
    instances?: number;
  }) {

  const stickyProperties = [
    {
      label: i18n.translate('xpack.apm.agentInstancesDetails.serviceLabel', {
        defaultMessage: 'Service',
      }),
      fieldName: AgentExplorerFieldName.ServiceName,
      val: (
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <AgentIcon agentName={agentName} />
          </EuiFlexItem>
          <EuiFlexItem className="eui-textTruncate">
            <span className="eui-textTruncate">{serviceName}</span>
          </EuiFlexItem>
        </EuiFlexGroup>
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
            <span className="eui-textTruncate">
              {isLoading && <EuiLoadingSpinner size="s" />}
              {!isLoading && <>{instances}</>}
            </span>
          </EuiFlexItem>
        </EuiFlexGroup>
      ),
      width: '25%',
    },
    {
      label: i18n.translate('xpack.apm.agentInstancesDetails.agentDocsUrlLabel', {
        defaultMessage: 'Agent documentation',
      }),
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

export function AgentInstances({
  agent,
  onClose,
}: Props) {

  if(!agent){
    return null;
  }

  const instances = useAgentInstancesFetcher({ serviceName: agent.serviceName });

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
            agentRepoUrl={agent.agentRepoUrl}
            instances={instances.data?.agentInstances.instances}
            isLoading={isLoading}
          />
          <EuiHorizontalRule margin="m" />
          <EuiSpacer size="m" />
          <AgentInstancesDetails isLoading={isLoading} items={instances.data?.agentInstances.items ?? []} />
        </EuiFlyoutBody>
      </ResponsiveFlyout>
    </EuiPortal>
  );
}