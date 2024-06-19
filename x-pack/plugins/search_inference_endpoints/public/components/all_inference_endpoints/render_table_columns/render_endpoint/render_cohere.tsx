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
  embedding_type: string;
  model_id: string;
}

interface TaskSettings {
  input_type: string;
  truncate: string;
}

export const RenderCohere: React.FC<RenderEndpointProps> = ({ endpoint }) => {
  const serviceSettings = endpoint.service_settings as ServiceSettings;
  const taskSettings = endpoint.task_settings as TaskSettings;

  return (
    <EuiFlexGroup gutterSize="s" direction="column">
      <EuiFlexItem grow={false}>
        <strong>{endpoint.model_id}</strong>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="s">
          {serviceSettings.model_id && (
            <EuiFlexItem grow={false}>
              <EuiBadge color="default">{serviceSettings.model_id}</EuiBadge>
            </EuiFlexItem>
          )}
          <EuiFlexItem grow={false}>
            {serviceSettings.embedding_type && <span>{serviceSettings.embedding_type}</span>}
            {taskSettings.input_type && <span>, {taskSettings.input_type}</span>}
            {taskSettings.truncate && <span>, truncate: {taskSettings.truncate}</span>}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
