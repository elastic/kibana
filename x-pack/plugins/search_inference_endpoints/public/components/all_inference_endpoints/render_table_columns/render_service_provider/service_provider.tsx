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
import OpenAIIcon from '../../../../assets/images/providers/open_ai.svg';
import { ServiceProviderKeys } from '../../types';

interface ServiceProviderProps {
  providerKey: string;
}

interface ServiceProviderRecord {
  icon: string;
  name: string;
}

export const SERVICE_PROVIDERS: Record<string, ServiceProviderRecord> = {
  [ServiceProviderKeys.hugging_face]: {
    icon: huggingFaceIcon,
    name: 'Hugging Face',
  },
  [ServiceProviderKeys.elser]: {
    icon: elasticIcon,
    name: 'Elser',
  },
  [ServiceProviderKeys.elasticsearch]: {
    icon: elasticIcon,
    name: 'elasticsearch',
  },
  [ServiceProviderKeys.cohere]: {
    icon: cohereIcon,
    name: 'Cohere',
  },
  [ServiceProviderKeys.openai]: {
    icon: OpenAIIcon,
    name: 'OpenAI',
  },
  [ServiceProviderKeys.azureopenai]: {
    icon: OpenAIIcon,
    name: 'Azure OpenAI',
  },
};

export const ServiceProvider: React.FC<ServiceProviderProps> = ({ providerKey }) => {
  const provider = SERVICE_PROVIDERS[providerKey];

  return provider ? (
    <>
      <EuiIcon
        data-test-subj={`table-column-service-provider-${provider.name}`}
        type={provider.icon}
        style={{ marginRight: '8px' }}
      />
      <span>{provider.name}</span>
    </>
  ) : (
    <span>{providerKey}</span>
  );
};
