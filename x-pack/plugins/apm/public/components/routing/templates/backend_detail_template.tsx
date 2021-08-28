/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiTitle } from '@elastic/eui';
import React from 'react';
import { useApmBackendContext } from '../../../context/apm_backend/use_apm_backend_context';
import { ApmMainTemplate } from './apm_main_template';
import { SpanIcon } from '../../shared/span_icon';

interface Props {
  title: string;
  children: React.ReactNode;
}

export function BackendDetailTemplate({ title, children }: Props) {
  const {
    backendName,
    metadata: { data },
  } = useApmBackendContext();

  const metadata = data?.metadata;

  return (
    <ApmMainTemplate
      pageHeader={{
        pageTitle: (
          <EuiFlexGroup alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiTitle size="l">
                <h1>{backendName}</h1>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <SpanIcon
                type={metadata?.spanType}
                subtype={metadata?.spanSubtype}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        ),
      }}
    >
      {children}
    </ApmMainTemplate>
  );
}
