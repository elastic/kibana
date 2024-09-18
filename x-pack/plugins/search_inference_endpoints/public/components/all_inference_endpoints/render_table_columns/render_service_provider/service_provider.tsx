/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiIcon, EuiText } from '@elastic/eui';
import React from 'react';
import {
  ELASTIC_MODEL_DEFINITIONS,
  InferenceAPIConfigResponse,
} from '@kbn/ml-trained-models-utils';
import elasticIcon from '../../../../assets/images/providers/elastic.svg';
import huggingFaceIcon from '../../../../assets/images/providers/hugging_face.svg';
import cohereIcon from '../../../../assets/images/providers/cohere.svg';
import openAIIcon from '../../../../assets/images/providers/open_ai.svg';
import azureAIStudioIcon from '../../../../assets/images/providers/azure_ai_studio.svg';
import azureOpenAIIcon from '../../../../assets/images/providers/azure_open_ai.svg';
import googleAIStudioIcon from '../../../../assets/images/providers/google_ai_studio.svg';
import mistralIcon from '../../../../assets/images/providers/mistral.svg';
import amazonBedrockIcon from '../../../../assets/images/providers/amazon_bedrock.svg';
import { ServiceProviderKeys } from '../../types';
import * as i18n from './translations';

interface ServiceProviderProps {
  providerEndpoint: InferenceAPIConfigResponse;
}

interface ServiceProviderRecord {
  icon: string;
  name: string;
}

export const SERVICE_PROVIDERS: Record<ServiceProviderKeys, ServiceProviderRecord> = {
  [ServiceProviderKeys.amazonbedrock]: {
    icon: amazonBedrockIcon,
    name: 'Amazon Bedrock',
  },
  [ServiceProviderKeys.azureaistudio]: {
    icon: azureAIStudioIcon,
    name: 'Azure AI Studio',
  },
  [ServiceProviderKeys.azureopenai]: {
    icon: azureOpenAIIcon,
    name: 'Azure OpenAI',
  },
  [ServiceProviderKeys.cohere]: {
    icon: cohereIcon,
    name: 'Cohere',
  },
  [ServiceProviderKeys.elasticsearch]: {
    icon: elasticIcon,
    name: 'Elasticsearch',
  },
  [ServiceProviderKeys.elser]: {
    icon: elasticIcon,
    name: 'Elasticsearch',
  },
  [ServiceProviderKeys.googleaistudio]: {
    icon: googleAIStudioIcon,
    name: 'Google AI Studio',
  },
  [ServiceProviderKeys.hugging_face]: {
    icon: huggingFaceIcon,
    name: 'Hugging Face',
  },
  [ServiceProviderKeys.mistral]: {
    icon: mistralIcon,
    name: 'Mistral',
  },
  [ServiceProviderKeys.openai]: {
    icon: openAIIcon,
    name: 'OpenAI',
  },
};

export const ServiceProvider: React.FC<ServiceProviderProps> = ({ providerEndpoint }) => {
  const { service } = providerEndpoint;
  const provider = SERVICE_PROVIDERS[service];

  return provider ? (
    <EuiFlexGroup gutterSize="xs" direction="row" alignItems="center">
      <EuiFlexItem grow={0}>
        <EuiIcon
          data-test-subj={`table-column-service-provider-${service}`}
          type={provider.icon}
          style={{ marginRight: '8px' }}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFlexGroup gutterSize="xs" direction="column">
          <EuiFlexItem>
            <EuiText size="s" color="subdued">
              {provider.name}
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem>
            <EndpointModelInfo providerEndpoint={providerEndpoint} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  ) : (
    <span>{service}</span>
  );
};

const EndpointModelInfo: React.FC<ServiceProviderProps> = ({ providerEndpoint }) => {
  const serviceSettings = providerEndpoint.service_settings;
  const modelId =
    'model_id' in serviceSettings
      ? serviceSettings.model_id
      : 'model' in serviceSettings
      ? serviceSettings.model
      : undefined;

  const isEligibleForMITBadge = modelId && ELASTIC_MODEL_DEFINITIONS[modelId]?.license === 'MIT';

  return (
    <EuiFlexGroup gutterSize="xs" direction="column">
      <EuiFlexItem>
        <EuiFlexGroup gutterSize="xs" direction="row">
          <EuiFlexItem grow={0}>
            {modelId && (
              <EuiText size="s" color="subdued">
                {modelId}
              </EuiText>
            )}
          </EuiFlexItem>
          <EuiFlexItem grow={0}>
            {isEligibleForMITBadge ? (
              <EuiBadge
                color="hollow"
                iconType="popout"
                iconSide="right"
                href={ELASTIC_MODEL_DEFINITIONS[modelId].licenseUrl ?? ''}
                target="_blank"
                data-test-subj={'mit-license-badge'}
              >
                {i18n.MIT_LICENSE}
              </EuiBadge>
            ) : null}{' '}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem>{endpointModelAtrributes(providerEndpoint)}</EuiFlexItem>
    </EuiFlexGroup>
  );
};

function endpointModelAtrributes(endpoint: InferenceAPIConfigResponse) {
  switch (endpoint.service) {
    case ServiceProviderKeys.hugging_face:
      return huggingFaceAttributes(endpoint);
    case ServiceProviderKeys.azureaistudio:
      return azureOpenAIStudioAttributes(endpoint);
    case ServiceProviderKeys.azureopenai:
      return azureOpenAIAttributes(endpoint);
    default:
      return null;
  }
}

function huggingFaceAttributes(endpoint: InferenceAPIConfigResponse) {
  const serviceSettings = endpoint.service_settings;
  const url = 'url' in serviceSettings ? serviceSettings.url : null;

  return url;
}

function azureOpenAIStudioAttributes(endpoint: InferenceAPIConfigResponse) {
  const serviceSettings = endpoint.service_settings;
  return 'provider' in serviceSettings ? serviceSettings?.provider : undefined;
}

function azureOpenAIAttributes(endpoint: InferenceAPIConfigResponse) {
  const serviceSettings = endpoint.service_settings;

  return 'resource_name' in serviceSettings ? serviceSettings.resource_name : undefined;
}
