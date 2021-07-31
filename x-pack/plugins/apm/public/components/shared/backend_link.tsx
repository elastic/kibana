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

const StyledLink = euiStyled(EuiLink)`${truncate('100%')};`;

interface BackendLinkProps {
  backendName: string;
  query?: TypeOf<ApmRoutes, '/backends/:backendName/overview'>['query'];
  subtype?: string;
  type?: string;
}

export function BackendLink({
  backendName,
  query,
  subtype,
  type,
}: BackendLinkProps) {
  const { link } = useApmRouter();

  return (
    <StyledLink
      href={link('/backends/:backendName/overview', {
        path: { backendName },
        query,
      })}
    >
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <SpanIcon type={type} subtype={subtype} />
        </EuiFlexItem>
        <EuiFlexItem>{backendName}</EuiFlexItem>
      </EuiFlexGroup>
    </StyledLink>
  );
}
