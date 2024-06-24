/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderReactTestingLibraryWithI18n as render } from '@kbn/test-jest-helpers';
import { fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { useCopyIDAction } from './use_copy_id_action';
import { useKibana } from '../../../../../../hooks/use_kibana';

const mockInferenceEndpoint = {
  deployment: 'not_applicable',
  endpoint: {
    model_id: 'hugging-face-embeddings',
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

const mockOnActionSuccess = jest.fn();

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

describe('useCopyIDAction hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the label with correct text', () => {
    const TestComponent = () => {
      const { getAction } = useCopyIDAction({ onActionSuccess: mockOnActionSuccess });
      const action = getAction(mockInferenceEndpoint);
      return <div>{action.name}</div>;
    };

    const { getByTestId } = render(<TestComponent />);
    const labelElement = getByTestId('inference-endpoints-action-copy-id-label');

    expect(labelElement).toHaveTextContent('Copy endpoint ID');
  });

  it('calls onActionSuccess and shows success toast when onClick is triggered', async () => {
    const { getAction } = useCopyIDAction({ onActionSuccess: mockOnActionSuccess });
    const action = getAction(mockInferenceEndpoint);

    render(<button onClick={action.onClick}>Copy ID</button>);
    const button = document.querySelector('button');
    if (button) {
      fireEvent.click(button);
    }

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        mockInferenceEndpoint.endpoint.model_id
      );
      expect(mockOnActionSuccess).toHaveBeenCalled();
    });
  });
});
