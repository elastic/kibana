/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiLoadingSpinner, EuiText } from '@elastic/eui';
import { useAiRulesMonitoringContext } from './ai_rules_monitoring_context';

export function AiRulesMonitoringPage(): JSX.Element {
  const { isLoading, hasConnector, connectorPrompt } = useAiRulesMonitoringContext();

  if (isLoading) {
    return (
      <EuiFlexGroup justifyContent="center">
        <EuiLoadingSpinner size="xxl" />
      </EuiFlexGroup>
    );
  }

  if (!hasConnector) {
    return (
      <EuiFlexGroup direction="column" alignItems="center">
        <EuiText>
          {`To be able to use Gen AI assisted Rule Monitoring you need to configure an Generative AI
          Connector. The connector will be shared with AI Assistant.`}
        </EuiText>
        {connectorPrompt}
      </EuiFlexGroup>
    );
  }

  return <>{'all is set'}</>;
}
