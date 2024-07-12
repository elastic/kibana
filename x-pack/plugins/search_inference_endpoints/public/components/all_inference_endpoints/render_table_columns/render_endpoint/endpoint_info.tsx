/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { InferenceAPIConfigResponse } from '@kbn/ml-trained-models-utils';
import { EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { ServiceProviderKeys } from '../../types';
import { ModelBadge } from './model_badge';
import * as i18n from './translations';

export interface EndpointInfoProps {
  endpoint: InferenceAPIConfigResponse;
}

export const EndpointInfo: React.FC<EndpointInfoProps> = ({ endpoint }) => {
  return (
    <EuiFlexGroup gutterSize="s" direction="column">
      <EuiFlexItem grow={false}>
        <strong>{endpoint.model_id}</strong>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EndpointModelInfo endpoint={endpoint} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const EndpointModelInfo: React.FC<EndpointInfoProps> = ({ endpoint }) => {
  const serviceSettings = endpoint.service_settings;
  const modelId =
    'model_id' in serviceSettings
      ? serviceSettings.model_id
      : 'model' in serviceSettings
      ? serviceSettings.model
      : undefined;

  return (
    <EuiFlexGroup gutterSize="s" alignItems="center">
      {modelId && (
        <EuiFlexItem grow={false}>
          <ModelBadge model={modelId} />
        </EuiFlexItem>
      )}
      <EuiFlexItem grow={false}>
        <EuiText color="subdued" size="xs">
          {endpointModelAtrributes(endpoint)}
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

function endpointModelAtrributes(endpoint: InferenceAPIConfigResponse) {
  switch (endpoint.service) {
    case ServiceProviderKeys.elser:
    case ServiceProviderKeys.elasticsearch:
      return elasticsearchAttributes(endpoint);
    case ServiceProviderKeys.cohere:
      return cohereAttributes(endpoint);
    case ServiceProviderKeys.hugging_face:
      return huggingFaceAttributes(endpoint);
    case ServiceProviderKeys.openai:
      return openAIAttributes(endpoint);
    case ServiceProviderKeys.azureaistudio:
      return azureOpenAIStudioAttributes(endpoint);
    case ServiceProviderKeys.azureopenai:
      return azureOpenAIAttributes(endpoint);
    case ServiceProviderKeys.mistral:
      return mistralAttributes(endpoint);
    case ServiceProviderKeys.googleaistudio:
      return googleAIStudioAttributes(endpoint);
    default:
      return null;
  }
}

function elasticsearchAttributes(endpoint: InferenceAPIConfigResponse) {
  const serviceSettings = endpoint.service_settings;

  const numAllocations =
    'num_allocations' in serviceSettings ? serviceSettings.num_allocations : undefined;
  const numThreads = 'num_threads' in serviceSettings ? serviceSettings.num_threads : undefined;

  return `${numThreads ? i18n.THREADS(numThreads) : ''}${
    numThreads && numAllocations ? ' | ' : ''
  }${numAllocations ? i18n.ALLOCATIONS(numAllocations) : ''}`;
}

function cohereAttributes(endpoint: InferenceAPIConfigResponse) {
  const serviceSettings = endpoint.service_settings;
  const embeddingType =
    'embedding_type' in serviceSettings ? serviceSettings.embedding_type : undefined;

  const taskSettings = endpoint.task_settings;
  const inputType = 'input_type' in taskSettings ? taskSettings.input_type : undefined;
  const truncate = 'truncate' in taskSettings ? taskSettings.truncate : undefined;

  return [embeddingType, inputType, truncate && `truncate: ${truncate}`].filter(Boolean).join(', ');
}

function huggingFaceAttributes(endpoint: InferenceAPIConfigResponse) {
  const serviceSettings = endpoint.service_settings;
  const url = 'url' in serviceSettings ? serviceSettings.url : null;

  return url;
}

function openAIAttributes(endpoint: InferenceAPIConfigResponse) {
  const serviceSettings = endpoint.service_settings;
  const url = 'url' in serviceSettings ? serviceSettings.url : null;

  return url;
}

function azureOpenAIStudioAttributes(endpoint: InferenceAPIConfigResponse) {
  const serviceSettings = endpoint.service_settings;
  const provider = 'provider' in serviceSettings ? serviceSettings.provider : undefined;
  const endpointType =
    'endpoint_type' in serviceSettings ? serviceSettings.endpoint_type : undefined;
  const target = 'target' in serviceSettings ? serviceSettings.target : undefined;

  return [provider, endpointType, target].filter(Boolean).join(', ');
}

function azureOpenAIAttributes(endpoint: InferenceAPIConfigResponse) {
  const serviceSettings = endpoint.service_settings;

  const resourceName =
    'resource_name' in serviceSettings ? serviceSettings.resource_name : undefined;
  const deploymentId =
    'deployment_id' in serviceSettings ? serviceSettings.deployment_id : undefined;
  const apiVersion = 'api_version' in serviceSettings ? serviceSettings.api_version : undefined;

  return [resourceName, deploymentId, apiVersion].filter(Boolean).join(', ');
}

function mistralAttributes(endpoint: InferenceAPIConfigResponse) {
  const serviceSettings = endpoint.service_settings;

  const maxInputTokens =
    'max_input_tokens' in serviceSettings ? serviceSettings.max_input_tokens : undefined;
  const rateLimit =
    'rate_limit' in serviceSettings ? serviceSettings.rate_limit.requests_per_minute : undefined;

  return [
    maxInputTokens && `max_input_tokens: ${maxInputTokens}`,
    rateLimit && `rate_limit: ${rateLimit}`,
  ]
    .filter(Boolean)
    .join(', ');
}

function googleAIStudioAttributes(endpoint: InferenceAPIConfigResponse) {
  const serviceSettings = endpoint.service_settings;

  const rateLimit =
    'rate_limit' in serviceSettings ? serviceSettings.rate_limit.requests_per_minute : undefined;

  return rateLimit && `rate_limit: ${rateLimit}`;
}
