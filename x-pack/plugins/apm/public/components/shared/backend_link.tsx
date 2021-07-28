/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiLink } from '@elastic/eui';
import React from 'react';
import { useApmRouter } from '../../hooks/use_apm_router';
import { SpanIcon } from './span_icon';

interface BackendLinkProps {
  backendName: string;
  query: Record<string, string | undefined>;
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
    <EuiLink
      href={link('/backends/:backendName/overview', {
        path: { backendName },
        query,
      })}
    >
      <EuiFlexGroup gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <SpanIcon type={type} subtype={subtype} />
        </EuiFlexItem>
        <EuiFlexItem>{backendName}</EuiFlexItem>
      </EuiFlexGroup>
    </EuiLink>
  );
}
