/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiLink, EuiToolTip } from '@elastic/eui';
import React from 'react';
import { TypeOf } from '@kbn/typed-react-router-config';
import { euiStyled } from '@kbn/kibana-react-plugin/common';
import { truncate } from '../../utils/style';
import { useApmRouter } from '../../hooks/use_apm_router';
import { AgentIcon } from './agent_icon';
import { AgentName } from '../../../typings/es_schemas/ui/fields/agent';
import { ApmRoutes } from '../routing/apm_route_config';
import { isMobileAgentName } from '../../../common/agent_name';
import { i18n } from '@kbn/i18n';

const StyledLink = euiStyled(EuiLink)`${truncate('100%')};`;

interface ServiceLinkProps {
  agentName?: AgentName;
  query: TypeOf<ApmRoutes, '/services/{serviceName}/overview'>['query'];
  serviceName: string;
}

const serviceDroppedBucketName = '_other';

export function ServiceLink({
                              agentName,
                              query,
                              serviceName
                            }: ServiceLinkProps) {
  const { link } = useApmRouter();

  const serviceLink = isMobileAgentName(agentName)
    ? '/mobile-services/{serviceName}/overview'
    : '/services/{serviceName}/overview';

  if (serviceName === serviceDroppedBucketName) {
    return (
      <EuiToolTip
        content={i18n.translate(
          'xpack.apm.serviceLink.tooltip.message',
          {
            defaultMessage:
              'The maximum number of services were reached. Please see the APM Server docs for \'aggregation.service.max_groups\' to increase this'
          }
        )}
      >
        <EuiFlexGroup alignItems='center' gutterSize='xs'>
          <EuiFlexItem>
            {i18n.translate('xpack.apm.serviceLink.other.label', {
              defaultMessage: '_other'
            })}
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiIcon size='s' color='subdued' type='alert' />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiToolTip>
    );
  }

  return (
    <StyledLink
      data-test-subj={`serviceLink_${agentName}`}
      href={link(serviceLink, {
        path: { serviceName },
        query
      })}
    >
      <EuiFlexGroup alignItems='center' gutterSize='s' responsive={false}>
        <EuiFlexItem grow={false}>
          <AgentIcon agentName={agentName} />
        </EuiFlexItem>
        <EuiFlexItem className='eui-textTruncate'>
          <span className='eui-textTruncate'>{serviceName}</span>
        </EuiFlexItem>
      </EuiFlexGroup>
    </StyledLink>
  );
}
