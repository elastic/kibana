/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderReactTestingLibraryWithI18n as render } from '@kbn/test-jest-helpers';
import React from 'react';
import { useKibana } from '../../../../../../hooks/use_kibana';
import { CopyIDAction } from './copy_id_action';

const mockInferenceEndpoint = {
  deployment: 'not_applicable',
  endpoint: {
    inference_id: 'hugging-face-embeddings',
    task_type: 'text_embedding',
    service: 'hugging_face',
    service_settings: {
      dimensions: 768,
      rate_limit: {
        requests_per_minute: 3000,
      },
    },
    task_settings: {},
  },
  provider: 'hugging_face',
  type: 'text_embedding',
} as any;

Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: jest.fn().mockResolvedValue(undefined),
  },
  configurable: true,
});

jest.mock('../../../../../../hooks/use_kibana', () => ({
  useKibana: jest.fn(),
}));

const addSuccess = jest.fn();

(useKibana as jest.Mock).mockImplementation(() => ({
  services: {
    notifications: {
      toasts: {
        addSuccess,
      },
    },
  },
}));

describe('CopyIDAction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the label with correct text', () => {
    const TestComponent = () => {
      return <CopyIDAction inferenceId={mockInferenceEndpoint.endpoint.inference_id} />;
    };

    const { getByTestId } = render(<TestComponent />);
    const labelElement = getByTestId('inference-endpoints-action-copy-id-label');

    expect(labelElement).toBeVisible();
  });
});
