/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiIcon } from '@elastic/eui';
import React from 'react';
import elasticIcon from '../../../../assets/images/providers/elastic.svg';
import huggingFaceIcon from '../../../../assets/images/providers/hugging_face.svg';
import cohereIcon from '../../../../assets/images/providers/cohere.svg';
import openAIIcon from '../../../../assets/images/providers/open_ai.svg';
import azureAIStudioIcon from '../../../../assets/images/providers/azure_ai_studio.svg';
import azureOpenAIIcon from '../../../../assets/images/providers/azure_open_ai.svg';
import googleAIStudioIcon from '../../../../assets/images/providers/google_ai_studio.svg';
import mistralIcon from '../../../../assets/images/providers/mistral.svg';
import amazonBedrockIcon from '../../../../assets/images/providers/amazon_bedrock.svg';
import alibabaCloudAISearchIcon from '../../../../assets/images/providers/alibaba_cloud_ai_search.svg';
import { ServiceProviderKeys } from '../../types';

interface ServiceProviderProps {
  providerKey: ServiceProviderKeys;
}

interface ServiceProviderRecord {
  icon: string;
  name: string;
}

export const SERVICE_PROVIDERS: Record<ServiceProviderKeys, ServiceProviderRecord> = {
  [ServiceProviderKeys['alibabacloud-ai-search']]: {
    icon: alibabaCloudAISearchIcon,
    name: 'AlibabaCloud AI Search',
  },  
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
    name: 'ELSER',
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

export const ServiceProvider: React.FC<ServiceProviderProps> = ({ providerKey }) => {
  const provider = SERVICE_PROVIDERS[providerKey];

  return provider ? (
    <>
      <EuiIcon
        data-test-subj={`table-column-service-provider-${providerKey}`}
        type={provider.icon}
        style={{ marginRight: '8px' }}
      />
      <span>{provider.name}</span>
    </>
  ) : (
    <span>{providerKey}</span>
  );
};
