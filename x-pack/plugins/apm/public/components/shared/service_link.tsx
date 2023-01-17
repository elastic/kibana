/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiCode,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiText,
} from '@elastic/eui';
import React from 'react';
import { TypeOf } from '@kbn/typed-react-router-config';
import { euiStyled } from '@kbn/kibana-react-plugin/common';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { TruncateWithTooltip } from './truncate_with_tooltip';
import { truncate, unit } from '../../utils/style';
import { useApmRouter } from '../../hooks/use_apm_router';
import { AgentIcon } from './agent_icon';
import { AgentName } from '../../../typings/es_schemas/ui/fields/agent';
import { ApmRoutes } from '../routing/apm_route_config';
import { isMobileAgentName } from '../../../common/agent_name';
import { NOT_AVAILABLE_LABEL } from '../../../common/i18n';
import { PopoverTooltip } from './popover_tooltip';

const StyledLink = euiStyled(EuiLink)`${truncate('100%')};`;

function formatString(value?: string | null) {
  return value || NOT_AVAILABLE_LABEL;
}

interface ServiceLinkProps {
  agentName?: AgentName;
  query: TypeOf<ApmRoutes, '/services/{serviceName}/overview'>['query'];
  serviceName: string;
}

export const OTHER_SERVICE_NAME = '_other';

export function ServiceLink({
  agentName,
  query,
  serviceName,
}: ServiceLinkProps) {
  const { link } = useApmRouter();

  const serviceLink = isMobileAgentName(agentName)
    ? '/mobile-services/{serviceName}/overview'
    : '/services/{serviceName}/overview';

  if (serviceName === OTHER_SERVICE_NAME) {
    return (
      <EuiFlexGroup alignItems="center" gutterSize="xs">
        <EuiFlexItem grow={false}>
          <EuiText
            grow={false}
            style={{ fontStyle: 'italic', fontSize: '1rem' }}
          >
            _other
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem>
          <PopoverTooltip
            ariaLabel={i18n.translate('xpack.apm.serviceLink.tooltip', {
              defaultMessage: 'Max service groups reached tooltip',
            })}
            iconType="alert"
          >
            <EuiText style={{ width: `${unit * 28}px` }} size="s">
              <FormattedMessage
                defaultMessage="The maximum number of unique services has been reached. Please increase {codeBlock} in APM Server."
                id="xpack.apm.serviceLink.tooltip.message"
                values={{
                  codeBlock: <EuiCode>aggregation.service.max_groups</EuiCode>,
                }}
              />
            </EuiText>
          </PopoverTooltip>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  return (
    <TruncateWithTooltip
      data-test-subj="apmServiceListAppLink"
      text={formatString(serviceName)}
      content={
        <StyledLink
          data-test-subj={`serviceLink_${agentName}`}
          href={link(serviceLink, {
            path: { serviceName },
            query,
          })}
        >
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              <AgentIcon agentName={agentName} />
            </EuiFlexItem>
            <EuiFlexItem className="eui-textTruncate">
              <span className="eui-textTruncate">{serviceName}</span>
            </EuiFlexItem>
          </EuiFlexGroup>
        </StyledLink>
      }
    />
  );
}
