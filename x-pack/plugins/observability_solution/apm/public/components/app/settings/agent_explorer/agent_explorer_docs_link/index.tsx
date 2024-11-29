/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiIcon, EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { isOpenTelemetryAgentName } from '../../../../../../common/agent_name';
import { NOT_AVAILABLE_LABEL } from '../../../../../../common/i18n';
import { AgentName } from '../../../../../../typings/es_schemas/ui/fields/agent';

interface AgentExplorerDocsLinkProps {
  agentName: AgentName;
  repositoryUrl?: string;
}

export function AgentExplorerDocsLink({ agentName, repositoryUrl }: AgentExplorerDocsLinkProps) {
  if (!repositoryUrl) {
    return <>{NOT_AVAILABLE_LABEL}</>;
  }

  return (
    <EuiLink
      data-test-subj={`agentExplorerDocsLink_${agentName}`}
      href={repositoryUrl}
      target="_blank"
      external
    >
      {isOpenTelemetryAgentName(agentName) ? (
        <EuiIcon
          type="documentation"
          size="m"
          title={i18n.translate('xpack.apm.agentExplorer.docsLink.otel.logo', {
            defaultMessage: 'Opentelemetry logo',
          })}
        />
      ) : (
        <EuiIcon
          type="logoElastic"
          size="m"
          title={i18n.translate('xpack.apm.agentExplorer.docsLink.elastic.logo', {
            defaultMessage: 'Elastic logo',
          })}
        />
      )}{' '}
      {i18n.translate('xpack.apm.agentExplorer.docsLink.message', {
        defaultMessage: 'Docs',
      })}
    </EuiLink>
  );
}
