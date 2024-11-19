/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';
import { ServiceProviderIcon, ServiceProviderName } from './service_provider';
import { ServiceProviderKeys } from '../../../../../common/inference/constants';

jest.mock('../assets/images/elastic.svg', () => 'elasticIcon.svg');
jest.mock('../assets/images/hugging_face.svg', () => 'huggingFaceIcon.svg');
jest.mock('../assets/images/cohere.svg', () => 'cohereIcon.svg');
jest.mock('../assets/images/open_ai.svg', () => 'openAIIcon.svg');

describe('ServiceProviderIcon component', () => {
  it('renders Hugging Face icon and name when providerKey is hugging_face', () => {
    render(<ServiceProviderIcon providerKey={ServiceProviderKeys.hugging_face} />);
    const icon = screen.getByTestId('icon-service-provider-hugging_face');
    expect(icon).toBeInTheDocument();
  });

  it('renders Open AI icon and name when providerKey is openai', () => {
    render(<ServiceProviderIcon providerKey={ServiceProviderKeys.openai} />);
    const icon = screen.getByTestId('icon-service-provider-openai');
    expect(icon).toBeInTheDocument();
  });
});

describe('ServiceProviderName component', () => {
  it('renders Hugging Face icon and name when providerKey is hugging_face', () => {
    render(<ServiceProviderName providerKey={ServiceProviderKeys.hugging_face} />);
    expect(screen.getByText('Hugging Face')).toBeInTheDocument();
  });

  it('renders Open AI icon and name when providerKey is openai', () => {
    render(<ServiceProviderName providerKey={ServiceProviderKeys.openai} />);
    expect(screen.getByText('OpenAI')).toBeInTheDocument();
  });
});
