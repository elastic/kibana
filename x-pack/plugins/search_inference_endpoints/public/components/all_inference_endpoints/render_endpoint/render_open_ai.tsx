/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiBadge } from '@elastic/eui';
import React from 'react';
import { RenderEndpointProps } from './render_endpoint';

interface ServiceSettings {
  similarity: string;
  model_id: string;
}

export const RenderOpenAI: React.FC<RenderEndpointProps> = ({ endpoint }) => {
  const serviceSettings = endpoint.service_settings as ServiceSettings | null;

  return (
    <EuiFlexGroup gutterSize="s" direction="column">
      <EuiFlexItem grow={false}>
        <strong>{endpoint.model_id}</strong>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="s">
          {serviceSettings?.model_id && (
            <EuiFlexItem grow={false}>
              <EuiBadge color="default">{serviceSettings.model_id}</EuiBadge>
            </EuiFlexItem>
          )}
          {serviceSettings?.similarity && (
            <EuiFlexItem grow={false}>{serviceSettings.similarity}</EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
