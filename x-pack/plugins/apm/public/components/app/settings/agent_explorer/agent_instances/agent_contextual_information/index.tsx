/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { TypeOf } from '@kbn/typed-react-router-config';
import React from 'react';
import { AgentName } from '../../../../../../../typings/es_schemas/ui/fields/agent';
import { useApmPluginContext } from '../../../../../../context/apm_plugin/use_apm_plugin_context';
import { useDefaultTimeRange } from '../../../../../../hooks/use_default_time_range';
import { ApmRoutes } from '../../../../../routing/apm_route_config';
import { ServiceLink } from '../../../../../shared/links/apm/service_link';
import { StickyProperties } from '../../../../../shared/sticky_properties';
import { getComparisonEnabled } from '../../../../../shared/time_comparison/get_comparison_enabled';
import { TruncateWithTooltip } from '../../../../../shared/truncate_with_tooltip';
import { AgentExplorerDocsLink } from '../../agent_explorer_docs_link';

const serviceLabel = i18n.translate(
  'xpack.apm.agentInstancesDetails.serviceLabel',
  {
    defaultMessage: 'Service',
  }
);

const agentNameLabel = i18n.translate(
  'xpack.apm.agentInstancesDetails.agentNameLabel',
  {
    defaultMessage: 'Agent Name',
  }
);

const instancesLabel = i18n.translate(
  'xpack.apm.agentInstancesDetails.intancesLabel',
  {
    defaultMessage: 'Instances',
  }
);

const agentDocsLabel = i18n.translate(
  'xpack.apm.agentInstancesDetails.agentDocsUrlLabel',
  {
    defaultMessage: 'Agent documentation',
  }
);

export function AgentContextualInformation({
  agentName,
  serviceName,
  agentDocsPageUrl,
  instances,
  query,
}: {
  agentName: AgentName;
  serviceName: string;
  agentDocsPageUrl?: string;
  instances: number;
  query: TypeOf<ApmRoutes, '/settings/agent-explorer'>['query'];
}) {
  const { core } = useApmPluginContext();
  const comparisonEnabled = getComparisonEnabled({ core });
  const { rangeFrom, rangeTo } = useDefaultTimeRange();

  const stickyProperties = [
    {
      label: serviceLabel,
      fieldName: serviceLabel,
      val: (
        <TruncateWithTooltip
          data-test-subj="apmAgentExplorerListServiceLink"
          text={serviceName}
          content={
            <ServiceLink
              agentName={agentName}
              query={{
                kuery: query.kuery,
                serviceGroup: '',
                rangeFrom,
                rangeTo,
                environment: query.environment,
                comparisonEnabled,
              }}
              serviceName={serviceName}
            />
          }
        />
      ),
      width: '25%',
    },
    {
      label: agentNameLabel,
      fieldName: agentNameLabel,
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
      label: instancesLabel,
      fieldName: instancesLabel,
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
      label: agentDocsLabel,
      fieldName: agentDocsLabel,
      val: (
        <TruncateWithTooltip
          data-test-subj="apmAgentExplorerListDocsLink"
          text={`${agentName} agent docs`}
          content={
            <AgentExplorerDocsLink
              agentName={agentName}
              repositoryUrl={agentDocsPageUrl}
            />
          }
        />
      ),
      width: '25%',
    },
  ];

  return <StickyProperties stickyProperties={stickyProperties} />;
}
