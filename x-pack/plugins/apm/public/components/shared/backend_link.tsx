/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiLink } from '@elastic/eui';
import { TypeOf } from '@kbn/typed-react-router-config';
import React from 'react';
import { euiStyled } from '../../../../../../src/plugins/kibana_react/common';
import { useApmRouter } from '../../hooks/use_apm_router';
import { truncate } from '../../utils/style';
import { ApmRoutes } from '../routing/apm_route_config';
import { SpanIcon } from './span_icon';
import { TruncateWithoutTooltip } from './truncate_with_tooltip';

const StyledLink = euiStyled(EuiLink)`min-width: 0`;

const tooltipAnchorClassname = '_apm_truncate_tooltip_anchor_';

const Wrapper = euiStyled.div`
  width: 50px;
  .${tooltipAnchorClassname} {
    width: 100% !important;
    display: block !important;
  }
`;

interface BackendLinkProps {
  query: TypeOf<ApmRoutes, '/backends/overview'>['query'];
  subtype?: string;
  type?: string;
  onClick?: React.ComponentProps<typeof EuiLink>['onClick'];
}

export function BackendLink({
  query,
  subtype,
  type,
  onClick,
}: BackendLinkProps) {
  const { link } = useApmRouter();

  return (
    <StyledLink
      href={link('/backends/overview', {
        query,
      })}
      onClick={onClick}
    >
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <SpanIcon type={type} subtype={subtype} />
        </EuiFlexItem>
        <EuiFlexItem>
          <Wrapper>
            <TruncateWithoutTooltip
              text={query.backendName}
              content={query.backendName}
            />
          </Wrapper>
        </EuiFlexItem>
      </EuiFlexGroup>
    </StyledLink>
  );
}
