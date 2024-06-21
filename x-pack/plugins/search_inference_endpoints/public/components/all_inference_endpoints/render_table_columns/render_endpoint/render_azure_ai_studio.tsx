/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';
import { RenderEndpointProps } from './render_endpoint';

interface ServiceSettings {
  target?: string;
  provider?: string;
  endpoint_type?: string;
}

export const RenderAzureAIStudio: React.FC<RenderEndpointProps> = ({ endpoint }) => {
  const serviceSettings = endpoint.service_settings as ServiceSettings;

  return (
    <EuiFlexGroup gutterSize="s" direction="column">
      <EuiFlexItem grow={false}>
        <strong>{endpoint.model_id}</strong>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexItem grow={false}>
          <span>
            {[serviceSettings.provider, serviceSettings.endpoint_type, serviceSettings.target]
              .filter(Boolean)
              .join(', ')}
          </span>
        </EuiFlexItem>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
