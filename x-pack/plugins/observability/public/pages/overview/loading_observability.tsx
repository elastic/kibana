/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { ObservabilityHeaderMenu } from '../../components/app/header';
import { usePluginContext } from '../../hooks/use_plugin_context';

export function LoadingObservability() {
  const { ObservabilityPageTemplate } = usePluginContext();

  return (
    <ObservabilityPageTemplate template="centeredContent" showSolutionNav={false}>
      <ObservabilityHeaderMenu />
      <EuiFlexGroup>
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="xl" />
        </EuiFlexItem>
        <EuiFlexItem grow={false} style={{ justifyContent: 'center' }}>
          <EuiText>{observabilityLoadingMessage}</EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </ObservabilityPageTemplate>
  );
}

const observabilityLoadingMessage = i18n.translate(
  'xpack.observability.overview.loadingObservability',
  {
    defaultMessage: 'Loading Observability',
  }
);
