/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';
import { RenderEndpointProps } from './render_endpoint';
import { ModelBadge } from './model_badge';

interface ServiceSettings {
  model?: string;
  max_input_tokens?: number;
  rate_limit?: {
    requests_per_minute?: number;
  };
}

export const RenderMistral: React.FC<RenderEndpointProps> = ({ endpoint }) => {
  const serviceSettings = endpoint.service_settings as ServiceSettings;

  return (
    <EuiFlexGroup gutterSize="s" direction="column">
      <EuiFlexItem grow={false}>
        <strong>{endpoint.model_id}</strong>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="s">
          {serviceSettings.model && (
            <EuiFlexItem grow={false}>
              <ModelBadge model={serviceSettings.model} />
            </EuiFlexItem>
          )}
          <EuiFlexItem grow={false}>
            <span>
              {[
                serviceSettings.max_input_tokens &&
                  `max_input_tokens: ${serviceSettings.max_input_tokens}`,
                serviceSettings.rate_limit?.requests_per_minute &&
                  `rate_limit: ${serviceSettings.rate_limit.requests_per_minute}`,
              ]
                .filter(Boolean)
                .join(', ')}
            </span>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
