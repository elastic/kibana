/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiBadge, EuiText } from '@elastic/eui';
import { AgentIcon } from '@kbn/custom-icons';
import { AgentName } from '@kbn/elastic-agent-utils';
import { i18n } from '@kbn/i18n';
import { useLinkProps } from '@kbn/observability-shared-plugin/public';

export interface LinkToApmServiceProps {
  serviceName: string;
  agentName: string | null;
  dateRange: { from: string; to: string };
}

export const LinkToApmService = ({ serviceName, agentName, dateRange }: LinkToApmServiceProps) => {
  const linkProps = useLinkProps({
    app: 'apm',
    pathname: `/services/${serviceName}/overview`,
    search: {
      rangeFrom: dateRange.from,
      rangeTo: dateRange.to,
    },
  });
  return (
    <EuiText>
      <EuiBadge
        data-test-subj="serviceLink"
        color="hollow"
        css={{ padding: '4px' }}
        href={linkProps.href as string}
        title={i18n.translate('xpack.infra.assetDetails.services.serviceButtonTitle', {
          defaultMessage: '{serviceName} last reported by {agentName}',
          values: { serviceName, agentName },
        })}
      >
        {agentName ? (
          <AgentIcon agentName={agentName as AgentName} size="m" css={{ marginRight: '4px' }} />
        ) : null}
        <span data-test-subj={`serviceNameText-${serviceName}`}>{serviceName}</span>
      </EuiBadge>
    </EuiText>
  );
};
