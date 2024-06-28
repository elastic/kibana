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

export interface RenderEndpointProps {
  endpoint: InferenceAPIConfigResponse;
}

export const RenderEndpoint: React.FC<RenderEndpointProps> = ({ endpoint }) => {
  return (
    <EuiFlexGroup gutterSize="s" direction="column">
      <EuiFlexItem grow={false}>
        <strong>{endpoint.model_id}</strong>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>{renderEndpointInfoByService(endpoint)}</EuiFlexItem>
    </EuiFlexGroup>
  );
};

function renderEndpointInfoByService(endpoint: InferenceAPIConfigResponse) {
  switch (endpoint.service) {
    case ServiceProviderKeys.elser:
    case ServiceProviderKeys.elasticsearch:
      return renderElasticsearch(endpoint);
    case ServiceProviderKeys.cohere:
      return renderCohere(endpoint);
    case ServiceProviderKeys.hugging_face:
      return renderHuggingFace(endpoint);
    case ServiceProviderKeys.openai:
      return renderOpenAI(endpoint);
    case ServiceProviderKeys.azureaistudio:
      return renderAzureOpenAIStudio(endpoint);
    case ServiceProviderKeys.azureopenai:
      return renderAzureOpenAI(endpoint);
    case ServiceProviderKeys.mistral:
      return renderMistral(endpoint);
    case ServiceProviderKeys.googleaistudio:
      return renderGoogleAIStudio(endpoint);
    default:
      return null;
  }
}

function renderElasticsearch(endpoint: InferenceAPIConfigResponse) {
  const serviceSettings = endpoint.service_settings;

  const numAllocations =
    'num_allocations' in serviceSettings ? serviceSettings.num_allocations : undefined;
  const numThreads = 'num_threads' in serviceSettings ? serviceSettings.num_threads : undefined;
  const modelId = 'model_id' in serviceSettings ? serviceSettings.model_id : undefined;

  return (
    <EuiFlexGroup gutterSize="s" alignItems="center">
      {modelId && (
        <EuiFlexItem grow={false}>
          <ModelBadge model={modelId} />
        </EuiFlexItem>
      )}
      {(numThreads || numAllocations) && (
        <EuiFlexItem grow={false}>
          <EuiText color="subdued" size="xs">
            {numThreads && i18n.THREADS(numThreads)}
            {numThreads && numAllocations && ' | '}
            {numAllocations && i18n.ALLOCATIONS(numAllocations)}
          </EuiText>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
}

function renderCohere(endpoint: InferenceAPIConfigResponse) {
  const serviceSettings = endpoint.service_settings;
  const modelId = 'model_id' in serviceSettings ? serviceSettings.model_id : undefined;
  const embeddingType =
    'embedding_type' in serviceSettings ? serviceSettings.embedding_type : undefined;

  const taskSettings = endpoint.task_settings;
  const inputType = 'input_type' in taskSettings ? taskSettings.input_type : undefined;
  const truncate = 'truncate' in taskSettings ? taskSettings.truncate : undefined;

  return (
    <EuiFlexGroup gutterSize="s" alignItems="center">
      {modelId && (
        <EuiFlexItem grow={false}>
          <ModelBadge model={modelId} />
        </EuiFlexItem>
      )}
      <EuiFlexItem grow={false}>
        <EuiText color="subdued" size="xs">
          {[embeddingType, inputType, truncate && `truncate: ${truncate}`]
            .filter(Boolean)
            .join(', ')}
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

function renderHuggingFace(endpoint: InferenceAPIConfigResponse) {
  const serviceSettings = endpoint.service_settings;
  const url = 'url' in serviceSettings ? serviceSettings.url : null;

  return (
    <EuiText color="subdued" size="xs">
      {url}
    </EuiText>
  );
}

function renderOpenAI(endpoint: InferenceAPIConfigResponse) {
  const serviceSettings = endpoint.service_settings;

  const modelId = 'model_id' in serviceSettings ? serviceSettings.model_id : undefined;
  const url = 'url' in serviceSettings ? serviceSettings.url : undefined;

  return (
    <EuiFlexGroup gutterSize="s" alignItems="center">
      {modelId && (
        <EuiFlexItem grow={false}>
          <ModelBadge model={modelId} />
        </EuiFlexItem>
      )}
      {url && (
        <EuiFlexItem grow={false}>
          <EuiText color="subdued" size="xs">
            {url}
          </EuiText>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
}

function renderAzureOpenAIStudio(endpoint: InferenceAPIConfigResponse) {
  const serviceSettings = endpoint.service_settings;
  const provider = 'provider' in serviceSettings ? serviceSettings.provider : undefined;
  const endpointType =
    'endpoint_type' in serviceSettings ? serviceSettings.endpoint_type : undefined;
  const target = 'target' in serviceSettings ? serviceSettings.target : undefined;

  return (
    <EuiText color="subdued" size="xs">
      {[provider, endpointType, target].filter(Boolean).join(', ')}
    </EuiText>
  );
}

function renderAzureOpenAI(endpoint: InferenceAPIConfigResponse) {
  const serviceSettings = endpoint.service_settings;

  const resourceName =
    'resource_name' in serviceSettings ? serviceSettings.resource_name : undefined;
  const deploymentId =
    'deployment_id' in serviceSettings ? serviceSettings.deployment_id : undefined;
  const apiVersion = 'api_version' in serviceSettings ? serviceSettings.api_version : undefined;

  return (
    <EuiText color="subdued" size="xs">
      {[resourceName, deploymentId, apiVersion].filter(Boolean).join(', ')}
    </EuiText>
  );
}

function renderMistral(endpoint: InferenceAPIConfigResponse) {
  const serviceSettings = endpoint.service_settings;

  const model = 'model' in serviceSettings ? serviceSettings.model : undefined;
  const maxInputTokens =
    'max_input_tokens' in serviceSettings ? serviceSettings.max_input_tokens : undefined;
  const rateLimit =
    'rate_limit' in serviceSettings ? serviceSettings.rate_limit.requests_per_minute : undefined;

  return (
    <EuiFlexGroup gutterSize="s" alignItems="center">
      {model && (
        <EuiFlexItem grow={false}>
          <ModelBadge model={model} />
        </EuiFlexItem>
      )}
      <EuiFlexItem grow={false}>
        <EuiText color="subdued" size="xs">
          {[
            maxInputTokens && `max_input_tokens: ${maxInputTokens}`,
            rateLimit && `rate_limit: ${rateLimit}`,
          ]
            .filter(Boolean)
            .join(', ')}
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

function renderGoogleAIStudio(endpoint: InferenceAPIConfigResponse) {
  const serviceSettings = endpoint.service_settings;

  const modelId = 'model_id' in serviceSettings ? serviceSettings.model_id : undefined;
  const rateLimit =
    'rate_limit' in serviceSettings ? serviceSettings.rate_limit.requests_per_minute : undefined;

  return (
    <EuiFlexGroup gutterSize="s" alignItems="center">
      {modelId && (
        <EuiFlexItem grow={false}>
          <ModelBadge model={modelId} />
        </EuiFlexItem>
      )}
      <EuiFlexItem grow={false}>
        <EuiText color="subdued" size="xs">
          {rateLimit && `rate_limit: ${rateLimit}`}
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
