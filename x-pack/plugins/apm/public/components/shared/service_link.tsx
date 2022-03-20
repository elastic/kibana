/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiLink, EuiToolTip } from '@elastic/eui';
import React from 'react';
import { TypeOf } from '@kbn/typed-react-router-config';
import { euiStyled } from '../../../../../../src/plugins/kibana_react/common';
import { truncate } from '../../utils/style';
import { useApmRouter } from '../../hooks/use_apm_router';
import { AgentIcon } from './agent_icon';
import { AgentName } from '../../../typings/es_schemas/ui/fields/agent';
import { ApmRoutes } from '../routing/apm_route_config';
import {
  TruncateWithTooltip,
  TruncateWithoutTooltip,
} from './truncate_with_tooltip';

const StyledLink = euiStyled(EuiLink)`min-width: 0;`;

const tooltipAnchorClassname = '_apm_truncate_tooltip_anchor_';

const Wrapper = euiStyled.div`
  width: 175px;
  .${tooltipAnchorClassname} {
    width: 100% !important;
    display: block !important;
  }
`;

interface ServiceLinkProps {
  agentName?: AgentName;
  query: TypeOf<ApmRoutes, '/services/{serviceName}/overview'>['query'];
  serviceName: string;
}

export function ServiceLink({
  agentName,
  query,
  serviceName,
}: ServiceLinkProps) {
  const { link } = useApmRouter();

  return (
    <StyledLink
      data-test-subj={`serviceLink_${agentName}`}
      href={link('/services/{serviceName}/overview', {
        path: { serviceName },
        query,
      })}
    >
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <AgentIcon agentName={agentName} />
        </EuiFlexItem>
        <EuiFlexItem>
          <Wrapper>
            <TruncateWithoutTooltip text={serviceName} content={serviceName} />
          </Wrapper>
        </EuiFlexItem>
      </EuiFlexGroup>
    </StyledLink>
  );
}
