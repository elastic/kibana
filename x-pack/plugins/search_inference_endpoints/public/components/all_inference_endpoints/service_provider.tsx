/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiIcon } from '@elastic/eui';
import React from 'react';
import elasticIcon from '../../assets/images/providers/elastic.svg';
import huggingFaceIcon from '../../assets/images/providers/hugging_face.svg';
import cohereIcon from '../../assets/images/providers/cohere.svg';
import OpenAIIcon from '../../assets/images/providers/open_ai.svg';
import { ProviderKeys } from './types';

interface ServiceProviderProps {
  providerKey: string;
}

interface ProviderRecord {
  icon: string;
  name: string;
}

export const PROVIDERS: Record<string, ProviderRecord> = {
  [ProviderKeys.hugging_face]: {
    icon: huggingFaceIcon,
    name: 'Hugging Face',
  },
  [ProviderKeys.elser]: {
    icon: elasticIcon,
    name: 'Elser',
  },
  [ProviderKeys.elasticsearch]: {
    icon: elasticIcon,
    name: 'elasticsearch',
  },
  [ProviderKeys.cohere]: {
    icon: cohereIcon,
    name: 'Cohere',
  },
  [ProviderKeys.openai]: {
    icon: OpenAIIcon,
    name: 'Open AI',
  },
};

export const ServiceProvider: React.FC<ServiceProviderProps> = ({ providerKey }) => {
  const provider = PROVIDERS[providerKey];

  return (
    <>
      <EuiIcon type={provider.icon} style={{ marginRight: '8px' }} />
      <span> {provider.name} </span>
    </>
  );
};
