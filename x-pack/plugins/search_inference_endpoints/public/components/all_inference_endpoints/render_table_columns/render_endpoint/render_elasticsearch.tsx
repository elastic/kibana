/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiBadge } from '@elastic/eui';
import React from 'react';
import * as i18n from './translations';
import { RenderEndpointProps } from './render_endpoint';

interface ModelSettings {
  num_allocations: number;
  num_threads: number;
  model_id: string;
}

const ModelSettingsBadge: React.FC<{ modelSettings: ModelSettings }> = ({ modelSettings }) => (
  <EuiFlexGroup gutterSize="s">
    {modelSettings.model_id && (
      <EuiFlexItem grow={false}>
        <EuiBadge color="default">{modelSettings.model_id}</EuiBadge>
      </EuiFlexItem>
    )}
    {(modelSettings.num_threads || modelSettings.num_allocations) && (
      <EuiFlexItem grow={false}>
        {modelSettings.num_threads && i18n.THREADS(modelSettings.num_threads)}
        {modelSettings.num_threads && modelSettings.num_allocations && ' | '}
        {modelSettings.num_allocations && i18n.ALLOCATIONS(modelSettings.num_allocations)}
      </EuiFlexItem>
    )}
  </EuiFlexGroup>
);

export const RenderElasticsearch: React.FC<RenderEndpointProps> = ({ endpoint }) => {
  const modelSettings = endpoint.service_settings as ModelSettings | null;

  return (
    <EuiFlexGroup gutterSize="s" direction="column">
      <EuiFlexItem grow={false}>
        <strong>{endpoint.model_id}</strong>
      </EuiFlexItem>
      {modelSettings && <ModelSettingsBadge modelSettings={modelSettings} />}
    </EuiFlexGroup>
  );
};
